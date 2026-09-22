import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { promisify } from 'node:util'
import { migrateConfigFile } from '../startos/configMigration.ts'
import { copyStorage } from '../startos/storageCopy.ts'

const run = promisify(execFile)
const previousImage =
  'rommapp/romm:5.2.0@sha256:3512f2ca455782f90247271bed23116e6bc675bc74e379be2c41696e607ab11e'
const manifest = await fs.readFile(
  new URL('../startos/manifest/index.ts', import.meta.url),
  'utf8',
)
const currentImage = manifest.match(/'([^']*rommapp\/romm:[^']+)'/)?.[1]
const dockerfile = await fs.readFile(
  new URL('../mariadb.Dockerfile', import.meta.url),
  'utf8',
)
const databaseImage = dockerfile.match(/^FROM (\S+)$/m)?.[1]
assert.ok(currentImage)
assert.ok(databaseImage)

async function docker(args: string[]) {
  return run('docker', args, { timeout: 60000, maxBuffer: 4 * 1024 * 1024 })
}

test(
  'RomM preserves an account and library through 5.3 upgrade and shared-storage copy',
  { timeout: 600000 },
  async (t) => {
    const prefix = `romm-runtime-${randomUUID().slice(0, 10)}`
    const database = `${prefix}-db`
    const app = `${prefix}-app`
    const root = await fs.mkdtemp(path.join(tmpdir(), 'romm-runtime-'))
    const main = path.join(root, 'main')
    const shared = path.join(root, 'shared')
    const password = randomBytes(24).toString('hex')
    const containers = [app, database]
    t.after(async () => {
      for (const name of containers)
        await docker(['rm', '-fv', name]).catch(() => {})
      await fs.rm(root, { recursive: true, force: true })
    })
    await fs.mkdir(path.join(main, 'library', 'roms', 'gba'), {
      recursive: true,
    })
    await fs.mkdir(path.join(main, 'library', 'bios'), { recursive: true })
    for (const directory of ['config', 'sync', 'redis-data', 'assets']) {
      await fs.mkdir(path.join(main, directory), { recursive: true })
    }
    await fs.mkdir(shared)
    await fs.chmod(main, 0o755)
    await fs.writeFile(path.join(main, 'config', 'config.yml'), '{}\n')
    await fs.writeFile(
      path.join(main, 'library', 'roms', 'gba', 'fixture.gba'),
      'synthetic test bytes',
    )
    await fs.link(
      path.join(main, 'library', 'roms', 'gba', 'fixture.gba'),
      path.join(main, 'assets', 'fixture.gba'),
    )
    await fs.writeFile(
      path.join(main, 'store.json'),
      '{"private":"test secret"}',
    )
    await fs.writeFile(
      path.join(main, 'sync', 'private-key'),
      'private sync fixture',
    )
    await docker([
      'run',
      '-d',
      '--name',
      database,
      '--network',
      'none',
      '-e',
      `MARIADB_ROOT_PASSWORD=${password}`,
      '-e',
      `MARIADB_PASSWORD=${password}`,
      '-e',
      'MARIADB_DATABASE=romm',
      '-e',
      'MARIADB_USER=romm',
      databaseImage,
    ])
    const databaseDeadline = Date.now() + 120000
    while (true) {
      try {
        const result = await docker([
          'exec',
          '-e',
          `MYSQL_PWD=${password}`,
          database,
          'mariadb',
          '--protocol=tcp',
          '-h',
          '127.0.0.1',
          '-u',
          'romm',
          '-N',
          '-e',
          'SELECT 1',
        ])
        if (result.stdout.trim() === '1') break
      } catch {}
      if (Date.now() > databaseDeadline)
        assert.fail('Test database did not become ready')
      await delay(500)
    }

    async function start(image: string, directory: string, external = false) {
      const mounts = [
        '-v',
        `${main}:/romm`,
        '-v',
        `${main}/redis-data:/redis-data`,
      ]
      if (external) mounts.push('-v', `${directory}/library:/romm/library`)
      await docker([
        'run',
        '-d',
        '--name',
        app,
        '--network',
        `container:${database}`,
        ...mounts,
        '-e',
        'DB_HOST=127.0.0.1',
        '-e',
        'DB_PORT=3306',
        '-e',
        'DB_NAME=romm',
        '-e',
        'DB_USER=romm',
        '-e',
        `DB_PASSWD=${password}`,
        '-e',
        `ROMM_AUTH_SECRET_KEY=${password}`,
        '-e',
        'ROMM_BASE_URL=https://romm.example.test',
        image,
      ])
      const deadline = Date.now() + 180000
      while (Date.now() < deadline) {
        try {
          const response = await request('/heartbeat')
          if (response.status === 200) return JSON.parse(response.body)
        } catch {}
        await delay(1000)
      }
      const logs = await docker(['logs', '--tail', '80', app])
      assert.fail(`RomM did not become ready: ${logs.stdout}\n${logs.stderr}`)
    }

    async function request(endpoint: string, args: string[] = []) {
      const result = await docker([
        'exec',
        app,
        'curl',
        '-sS',
        '--max-time',
        '15',
        '-b',
        '/tmp/romm-runtime-cookies',
        '-c',
        '/tmp/romm-runtime-cookies',
        '-w',
        '\n%{http_code}',
        ...args,
        `http://127.0.0.1:8080/api${endpoint}`,
      ])
      const split = result.stdout.lastIndexOf('\n')
      return {
        status: Number(result.stdout.slice(split + 1)),
        body: result.stdout.slice(0, split),
      }
    }

    async function csrf() {
      const cookies = await docker([
        'exec',
        app,
        'cat',
        '/tmp/romm-runtime-cookies',
      ])
      const line = cookies.stdout
        .split('\n')
        .find((item) => item.split(/\s+/)[5] === 'romm_csrftoken')
      assert.ok(line)
      return line.split(/\s+/)[6]
    }

    async function login() {
      const response = await request('/login', [
        '-X',
        'POST',
        '-u',
        `admin:${password}`,
        '-H',
        `x-csrftoken: ${await csrf()}`,
      ])
      assert.equal(response.status, 200, response.body)
      const user = await request('/users/me')
      assert.equal(user.status, 200, user.body)
      assert.equal(JSON.parse(user.body).username, 'admin')
    }

    const initial = await start(previousImage, main)
    assert.equal(initial.SYSTEM.VERSION, '5.2.0')
    assert.equal(initial.SYSTEM.SHOW_SETUP_WIZARD, true)
    const created = await request('/users', [
      '-X',
      'POST',
      '-H',
      `x-csrftoken: ${await csrf()}`,
      '-H',
      'Content-Type: application/json',
      '-d',
      JSON.stringify({
        username: 'admin',
        email: 'admin@example.test',
        password,
        role: 'admin',
      }),
    ])
    assert.equal(created.status, 201, created.body)
    await login()
    await docker(['stop', '-t', '30', app])
    await docker(['rm', app])

    assert.equal(await migrateConfigFile(main), true)
    const upgraded = await start(currentImage, main)
    assert.equal(upgraded.SYSTEM.VERSION, '5.3.0')
    assert.equal(upgraded.SYSTEM.SHOW_SETUP_WIZARD, false)
    assert.deepEqual(upgraded.FILESYSTEM.FS_PLATFORMS, ['gba'])
    await login()
    await docker(['stop', '-t', '30', app])
    await docker(['rm', app])

    await copyStorage(main, shared, {
      uid: process.getuid!(),
      gid: process.getgid!(),
      requireMarker: false,
    })
    const moved = await start(currentImage, shared, true)
    assert.equal(moved.SYSTEM.VERSION, '5.3.0')
    assert.equal(moved.SYSTEM.SHOW_SETUP_WIZARD, false)
    assert.deepEqual(moved.FILESYSTEM.FS_PLATFORMS, ['gba'])
    await login()
    const copied = path.join(shared, 'library', 'roms', 'gba', 'fixture.gba')
    assert.equal(await fs.readFile(copied, 'utf8'), 'synthetic test bytes')
    await assert.rejects(fs.stat(path.join(shared, 'assets')), {
      code: 'ENOENT',
    })
    await assert.rejects(fs.stat(path.join(shared, 'resources')), {
      code: 'ENOENT',
    })
    assert.equal(
      await fs.readFile(path.join(main, 'assets', 'fixture.gba'), 'utf8'),
      'synthetic test bytes',
    )
    await assert.rejects(fs.stat(path.join(shared, 'store.json')), {
      code: 'ENOENT',
    })
    await assert.rejects(fs.stat(path.join(shared, 'config', 'config.yml')), {
      code: 'ENOENT',
    })
    await assert.rejects(fs.stat(path.join(shared, 'sync', 'private-key')), {
      code: 'ENOENT',
    })
    assert.equal(
      await fs.readFile(path.join(main, 'sync', 'private-key'), 'utf8'),
      'private sync fixture',
    )
  },
)
