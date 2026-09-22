import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { test } from 'node:test'
import { parse, stringify } from 'yaml'
import { migrateConfigFile } from '../startos/configMigration.ts'

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'romm-config-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const filename = path.join(root, 'config', 'config.yml')
  return {
    root,
    filename,
    backup: `${filename}.pre-5.3.0`,
    async write(contents: string) {
      await fs.mkdir(path.dirname(filename), { recursive: true })
      await fs.writeFile(filename, contents)
    },
    async directory(directory: string) {
      await fs.mkdir(path.join(root, 'library', directory), { recursive: true })
    },
    async read() {
      return parse(await fs.readFile(filename, 'utf8'))
    },
  }
}

test('fresh installs use the standard ROM and firmware layouts', async (t) => {
  const files = await fixture(t)
  assert.equal(await migrateConfigFile(files.root), true)
  assert.deepEqual(await files.read(), {
    filesystem: {
      structure: {
        default: 'roms/{platform}/{game}',
        firmware: 'bios/{platform}',
      },
    },
  })
  await assert.rejects(fs.stat(files.backup), { code: 'ENOENT' })
})

test('a standard existing library keeps its ROM paths and original configuration', async (t) => {
  const files = await fixture(t)
  await files.write('{}\n')
  await files.directory('roms/snes')
  await migrateConfigFile(files.root)
  assert.deepEqual((await files.read()).filesystem.structure, {
    default: 'roms/{platform}/{game}',
    firmware: 'bios/{platform}',
  })
  assert.equal(await fs.readFile(files.backup, 'utf8'), '{}\n')
})

test('a platform-first existing library keeps its ROM and firmware paths', async (t) => {
  const files = await fixture(t)
  await files.directory('snes/roms')
  await files.directory('snes/bios')
  await migrateConfigFile(files.root)
  assert.deepEqual((await files.read()).filesystem.structure, {
    default: '{platform}/roms/{game}',
    firmware: '{platform}/bios',
  })
})

test('top-level ROM storage keeps the same precedence as RomM 5.2', async (t) => {
  const files = await fixture(t)
  await files.directory('roms/snes')
  await files.directory('nes/roms')
  await migrateConfigFile(files.root)
  assert.equal(
    (await files.read()).filesystem.structure.default,
    'roms/{platform}/{game}',
  )
})

for (const nested of [false, true]) {
  test(`custom folder names survive migration with platform-first layout ${nested}`, async (t) => {
    const files = await fixture(t)
    await files.write(
      stringify({
        filesystem: { roms_folder: 'games', firmware_folder: 'firmware' },
      }),
    )
    await files.directory(nested ? 'snes/games' : 'games/snes')
    await migrateConfigFile(files.root)
    assert.deepEqual((await files.read()).filesystem, {
      structure: {
        default: nested ? '{platform}/games/{game}' : 'games/{platform}/{game}',
        firmware: nested ? '{platform}/firmware' : 'firmware/{platform}',
      },
    })
  })
}

test('explicit templates and custom configuration remain byte-for-byte unchanged', async (t) => {
  const files = await fixture(t)
  const original = stringify({
    filesystem: {
      structure: {
        default: 'roms/{platform}/{game}',
        firmware: 'bios/{platform}',
        snes: ['roms/{platform}/{game}', 'roms/{platform}/{region}/{game}'],
      },
    },
    streaming: {
      enabled: true,
      containers: [{ platform: 'ps2', host: 'https://example.test' }],
    },
  })
  await files.write(original)
  assert.equal(await migrateConfigFile(files.root), false)
  assert.equal(await fs.readFile(files.filename, 'utf8'), original)
  await assert.rejects(fs.stat(files.backup), { code: 'ENOENT' })
})

test('unrelated settings and legacy streaming containers survive a layout migration', async (t) => {
  const files = await fixture(t)
  const original = {
    system: { platforms: { ps1: 'psx' } },
    scan: { priority: { region: ['eu', 'us'] } },
    filesystem: { roms_folder: 'games', skip_hash_calculation: true },
    streaming: {
      enabled: true,
      containers: [{ platform: 'ps2', host: 'https://example.test' }],
    },
  }
  await files.write(stringify(original))
  await migrateConfigFile(files.root)
  assert.deepEqual(await files.read(), {
    ...original,
    filesystem: {
      skip_hash_calculation: true,
      structure: {
        default: 'games/{platform}/{game}',
        firmware: 'bios/{platform}',
      },
    },
  })
})

test('repeated migration preserves the first backup and current configuration', async (t) => {
  const files = await fixture(t)
  await files.write('{}\n')
  await migrateConfigFile(files.root)
  const converted = await fs.readFile(files.filename, 'utf8')
  assert.equal(await migrateConfigFile(files.root), false)
  assert.equal(await fs.readFile(files.filename, 'utf8'), converted)
  assert.equal(await fs.readFile(files.backup, 'utf8'), '{}\n')
})

test('an existing original backup is retained when migration resumes', async (t) => {
  const files = await fixture(t)
  await files.write('{}\n')
  await fs.writeFile(files.backup, 'original configuration\n')
  await migrateConfigFile(files.root)
  assert.equal(
    await fs.readFile(files.backup, 'utf8'),
    'original configuration\n',
  )
  assert.equal(
    (await files.read()).filesystem.structure.default,
    'roms/{platform}/{game}',
  )
})

test('files at the library root do not prevent platform-first detection', async (t) => {
  const files = await fixture(t)
  await files.directory('snes/roms')
  await fs.writeFile(
    path.join(files.root, 'library', 'gamelist.xml'),
    'metadata',
  )
  await migrateConfigFile(files.root)
  assert.equal(
    (await files.read()).filesystem.structure.default,
    '{platform}/roms/{game}',
  )
})

for (const original of [
  'null\n',
  'filesystem: null\n',
  'filesystem:\n  structure: null\n',
]) {
  test(`empty configuration sections get explicit templates: ${JSON.stringify(original)}`, async (t) => {
    const files = await fixture(t)
    await files.write(original)
    await migrateConfigFile(files.root)
    assert.equal(
      (await files.read()).filesystem.structure.default,
      'roms/{platform}/{game}',
    )
  })
}

for (const original of [
  'filesystem: [broken\n',
  '- not a mapping\n',
  'filesystem: invalid\n',
  'filesystem:\n  structure: invalid\n',
  'filesystem:\n  roms_folder: ../outside\n',
  'filesystem:\n  roms_folder: /outside\n',
  'filesystem:\n  roms_folder: roms\n  structure:\n    default: games/{platform}/{game}\n',
]) {
  test(`invalid or conflicting configuration is rejected without changing it: ${JSON.stringify(original)}`, async (t) => {
    const files = await fixture(t)
    await files.write(original)
    await assert.rejects(migrateConfigFile(files.root))
    assert.equal(await fs.readFile(files.filename, 'utf8'), original)
    await assert.rejects(fs.stat(files.backup), { code: 'ENOENT' })
  })
}

test('a symlinked configuration is rejected without replacing its target', async (t) => {
  const files = await fixture(t)
  await files.write('{}\n')
  const target = path.join(files.root, 'elsewhere.yml')
  await fs.rename(files.filename, target)
  await fs.symlink(target, files.filename)
  await assert.rejects(migrateConfigFile(files.root), /regular file/)
  assert.equal(await fs.readFile(target, 'utf8'), '{}\n')
  assert.equal((await fs.lstat(files.filename)).isSymbolicLink(), true)
})
