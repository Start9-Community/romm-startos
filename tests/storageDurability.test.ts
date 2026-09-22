import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { checkStorage, copyStorage } from '../startos/storageCopy.ts'
import { runStorageCopy } from '../startos/storageJob.ts'

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'romm-durability-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const source = join(root, 'source')
  const destination = join(root, 'destination')
  await mkdir(join(source, 'library'), { recursive: true })
  await mkdir(destination)
  await writeFile(join(source, 'library/game.bin'), 'original game')
  return {
    source,
    destination,
    options: {
      uid: process.getuid!(),
      gid: process.getgid!(),
      requireMarker: false,
    },
  }
}

test('completed copies remove temporary artifacts and retry after the source disappears', async (t) => {
  const { source, destination, options } = await fixture(t)
  const id = randomUUID()
  await runStorageCopy(source, destination, id, options)
  assert.deepEqual((await readdir(destination)).sort(), [
    '.romm-storage',
    'library',
  ])
  await writeFile(join(destination, 'library/game.bin'), 'later edit')
  await rm(source, { recursive: true })

  await runStorageCopy(source, destination, id, options)

  assert.equal(
    await readFile(join(destination, 'library/game.bin'), 'utf8'),
    'later edit',
  )
  await checkStorage(destination)
  assert.deepEqual((await readdir(destination)).sort(), [
    '.romm-storage',
    'library',
  ])
})

test('partial publication completes from persisted files without copying changed source data', async (t) => {
  const { source, destination, options } = await fixture(t)
  const id = randomUUID()
  const stage = join(destination, `.romm-copy-${id}`)
  await mkdir(stage)
  await mkdir(join(destination, `.romm-copy-job-${id}`))
  await copyStorage(source, stage, { ...options, completionId: id })
  const records: Record<string, { dev: number; ino: number }> = {}
  for (const name of ['library', '.romm-storage']) {
    const info = await lstat(join(stage, name))
    records[name] = { dev: info.dev, ino: info.ino }
  }
  await writeFile(join(destination, '.romm-publish'), JSON.stringify(records))
  await rename(join(stage, 'library'), join(destination, 'library'))
  await writeFile(join(source, 'library/game.bin'), 'changed source')
  await assert.rejects(checkStorage(destination))

  await runStorageCopy(source, destination, id, options)

  assert.equal(
    await readFile(join(destination, 'library/game.bin'), 'utf8'),
    'original game',
  )
  assert.equal(
    await readFile(join(source, 'library/game.bin'), 'utf8'),
    'changed source',
  )
  await checkStorage(destination)
  assert.deepEqual((await readdir(destination)).sort(), [
    '.romm-storage',
    'library',
  ])
})

test('completion receipt survives an interrupted journal cleanup', async (t) => {
  const { source, destination, options } = await fixture(t)
  const id = randomUUID()
  await runStorageCopy(source, destination, id, options)
  await mkdir(join(destination, `.romm-copy-job-${id}`))
  await writeFile(join(destination, '.romm-publish'), '{}')
  await writeFile(join(destination, 'library/game.bin'), 'later edit')

  await runStorageCopy(source, destination, id, options)

  assert.equal(
    await readFile(join(destination, 'library/game.bin'), 'utf8'),
    'later edit',
  )
  assert.deepEqual((await readdir(destination)).sort(), [
    '.romm-storage',
    'library',
  ])
})

test('a completed destination refuses a different job without changing its files', async (t) => {
  const { source, destination, options } = await fixture(t)
  await runStorageCopy(source, destination, randomUUID(), options)

  await assert.rejects(
    runStorageCopy(source, destination, randomUUID(), options),
    /destination must be empty/,
  )

  assert.equal(
    await readFile(join(destination, 'library/game.bin'), 'utf8'),
    'original game',
  )
  await checkStorage(destination)
})

test('a receipt cannot activate a symbolic link in place of the copied library', async (t) => {
  const { source, destination, options } = await fixture(t)
  const id = randomUUID()
  await runStorageCopy(source, destination, id, options)
  await rm(join(destination, 'library'), { recursive: true })
  await symlink(join(source, 'library'), join(destination, 'library'))

  await assert.rejects(
    runStorageCopy(source, destination, id, options),
    /library must be a directory/,
  )

  assert.equal(
    await readFile(join(source, 'library/game.bin'), 'utf8'),
    'original game',
  )
})
