import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  statfs,
  symlink,
  truncate,
  utimes,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { checkStorage, copyStorage } from '../startos/storageCopy.ts'

async function waitForFile(path: string) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (
      await lstat(path).then(
        () => true,
        () => false,
      )
    )
      return
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
  throw new Error('Destination file did not appear')
}

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'romm-storage-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const source = join(root, 'source')
  const target = join(root, 'target')
  await mkdir(source)
  await mkdir(target)
  const write = async (name: string, content: string) => {
    const path = join(source, name)
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, content)
    return path
  }
  const options = {
    uid: process.getuid!(),
    gid: process.getgid!(),
    requireMarker: false,
  }
  return { root, source, target, write, options }
}

test('copies multi-disc files and artwork, preserves hardlinks and excludes private state', async (t) => {
  const { source, target, write, options } = await fixture(t)
  const disc = await write('library/roms/ps/Game/Disc 1.bin', 'first disc')
  await write('library/roms/ps/Game/Disc 2.bin', 'second disc')
  await write('resources/cover.webp', 'cover art')
  await write('launchbox/metadata.xml', 'metadata')
  await mkdir(join(source, 'assets'))
  await link(disc, join(source, 'assets/disc.bin'))
  await chmod(disc, 0o600)
  await utimes(disc, 1600000000, 1600000000)
  for (const name of [
    'store.json',
    'config/config.yml',
    'sync/keys/id_ed25519',
    'redis-data/dump.rdb',
    'cache/zips/stale.zip',
  ]) {
    await write(name, 'private state')
  }

  assert.deepEqual(await copyStorage(source, target, options), {
    files: 5,
    bytes: 38,
  })
  const copiedDisc = join(target, 'library/roms/ps/Game/Disc 1.bin')
  assert.equal(await readFile(copiedDisc, 'utf8'), 'first disc')
  assert.equal(
    await readFile(join(target, 'library/roms/ps/Game/Disc 2.bin'), 'utf8'),
    'second disc',
  )
  assert.equal(
    (await stat(copiedDisc)).ino,
    (await stat(join(target, 'assets/disc.bin'))).ino,
  )
  assert.equal((await stat(copiedDisc)).mtimeMs, 1600000000000)
  assert.equal((await stat(copiedDisc)).mode & 0o777, 0o644)
  assert.equal((await stat(copiedDisc)).uid, process.getuid!())
  assert.deepEqual((await readdir(target)).sort(), [
    '.romm-storage',
    'assets',
    'launchbox',
    'library',
    'resources',
  ])
  assert.equal(await readFile(disc, 'utf8'), 'first disc')
  assert.equal((await stat(disc)).mode & 0o777, 0o600)
  assert.equal(
    await readFile(join(source, 'store.json'), 'utf8'),
    'private state',
  )
  await checkStorage(target)
})

test('rejects a nonempty destination without modifying either library', async (t) => {
  const { source, target, write, options } = await fixture(t)
  await write('library/game.bin', 'source game')
  await writeFile(join(target, 'existing.bin'), 'keep me')

  await assert.rejects(
    copyStorage(source, target, options),
    /destination must be empty/,
  )
  assert.equal(await readFile(join(target, 'existing.bin'), 'utf8'), 'keep me')
  assert.deepEqual(await readdir(target), ['existing.bin'])
  assert.equal(
    await readFile(join(source, 'library/game.bin'), 'utf8'),
    'source game',
  )
})

test('rejects a symbolic link to private data before writing destination files', async (t) => {
  const { source, target, write, options } = await fixture(t)
  await write('library/first.bin', 'game')
  const secret = await write('config/secret', 'secret')
  await symlink(secret, join(source, 'library/secret'))

  await assert.rejects(
    copyStorage(source, target, options),
    /Symbolic links are not supported/,
  )
  assert.deepEqual(await readdir(target), [])
  assert.equal(await readFile(secret, 'utf8'), 'secret')
})

test('rejects a broken symbolic link directory', async (t) => {
  const { root, source, target, options } = await fixture(t)
  await symlink(join(root, 'missing'), join(source, 'library'))

  await assert.rejects(
    copyStorage(source, target, options),
    /Symbolic links are not supported/,
  )
  assert.deepEqual(await readdir(target), [])
})

test('checks available space before copying a sparse file', async (t) => {
  const { source, target, write, options } = await fixture(t)
  const sparse = await write('library/large.bin', '')
  const space = await statfs(target)
  await truncate(sparse, space.bavail * space.bsize + 1024 * 1024)

  await assert.rejects(
    copyStorage(source, target, options),
    /not have enough free space/,
  )
  assert.deepEqual(await readdir(target), [])
  assert.ok((await stat(sparse)).size > 1024 * 1024)
})

test('supports copying a fresh empty library', async (t) => {
  const { source, target, options } = await fixture(t)

  assert.deepEqual(await copyStorage(source, target, options), {
    files: 0,
    bytes: 0,
  })
  await checkStorage(target)
})

test('rejects missing and invalid restore markers', async (t) => {
  const { source, target, write, options } = await fixture(t)
  await write('library/game.bin', 'game')

  await assert.rejects(
    copyStorage(source, target, { ...options, requireMarker: true }),
    /not been copied or restored completely/,
  )
  await assert.rejects(
    checkStorage(source),
    /not been copied or restored completely/,
  )
  assert.deepEqual(await readdir(target), [])
  await write('.romm-storage', 'invalid')
  await assert.rejects(checkStorage(source), /marker is invalid/)
})

test('rejects a symbolic link marker', async (t) => {
  const { root, source } = await fixture(t)
  await writeFile(join(root, 'marker'), '1\n')
  await symlink(join(root, 'marker'), join(source, '.romm-storage'))

  await assert.rejects(
    checkStorage(source),
    /not been copied or restored completely/,
  )
})

test('copies edited shared storage back into a fresh internal folder', async (t) => {
  const { root, source, target, write, options } = await fixture(t)
  await write('library/game.bin', 'first')
  await copyStorage(source, target, options)
  await writeFile(join(target, 'library/game.bin'), 'updated')
  const returned = join(root, 'returned')
  await mkdir(returned)

  await copyStorage(target, returned, { ...options, requireMarker: true })
  assert.equal(
    await readFile(join(returned, 'library/game.bin'), 'utf8'),
    'updated',
  )
  assert.equal(
    await readFile(join(target, 'library/game.bin'), 'utf8'),
    'updated',
  )
  assert.equal(
    await readFile(join(source, 'library/game.bin'), 'utf8'),
    'first',
  )
})

test('cancellation retains the source and leaves no completed destination marker', async (t) => {
  const { source, target, write, options } = await fixture(t)
  const file = await write('library/large.bin', '')
  await truncate(file, 32 * 1024 * 1024)
  const controller = new AbortController()
  const interrupt = (async () => {
    await waitForFile(join(target, 'library/large.bin'))
    controller.abort()
  })()

  await assert.rejects(
    copyStorage(source, target, { ...options, signal: controller.signal }),
    { name: 'AbortError' },
  )
  await interrupt
  assert.equal((await stat(file)).size, 32 * 1024 * 1024)
  await assert.rejects(
    checkStorage(target),
    /not been copied or restored completely/,
  )
})

test('rejects files added to an already visited source directory before activation', async (t) => {
  const { source, target, write, options } = await fixture(t)
  const file = await write('library/large.bin', '')
  await truncate(file, 32 * 1024 * 1024)
  const edit = (async () => {
    await waitForFile(join(target, 'library/large.bin'))
    await write('library/added.bin', 'new game')
  })()

  await assert.rejects(
    copyStorage(source, target, options),
    /source changed during copying/,
  )
  await edit
  assert.equal(
    await readFile(join(source, 'library/added.bin'), 'utf8'),
    'new game',
  )
  await assert.rejects(
    checkStorage(target),
    /not been copied or restored completely/,
  )
})

test('rejects late edits to a source file copied earlier', async (t) => {
  const { source, target, write, options } = await fixture(t)
  await write('library/a.bin', 'original')
  const large = await write('library/b.bin', '')
  await truncate(large, 32 * 1024 * 1024)
  const edit = (async () => {
    await waitForFile(join(target, 'library/b.bin'))
    await write('library/a.bin', 'changed after copy')
  })()

  await assert.rejects(
    copyStorage(source, target, options),
    /source changed during copying/,
  )
  await edit
  assert.equal(
    await readFile(join(source, 'library/a.bin'), 'utf8'),
    'changed after copy',
  )
  await assert.rejects(
    checkStorage(target),
    /not been copied or restored completely/,
  )
})
