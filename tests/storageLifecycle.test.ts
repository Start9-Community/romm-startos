import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { z } from '@start9labs/start-sdk'
import { runStorageCopy } from '../startos/storageJob.ts'
import { checkStorage } from '../startos/storageCopy.ts'
import {
  recoverInternalLibrary,
  removeRetainedLibrary,
  retainedLibraries,
} from '../startos/storageRecovery.ts'
import { storageFields, storageState } from '../startos/storageState.ts'

async function fixture(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'romm-lifecycle-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const source = join(root, 'main')
  const destination = join(root, 'shared')
  await mkdir(join(source, 'library'), { recursive: true })
  await mkdir(destination)
  await writeFile(join(source, 'library/a.bin'), 'first game')
  await writeFile(join(source, 'library/b.bin'), 'second game')
  return {
    root,
    source,
    destination,
    options: {
      uid: process.getuid!(),
      gid: process.getgid!(),
      requireMarker: false,
    },
  }
}

test('an interrupted job restarts in its original destination and preserves its source', async (t) => {
  const { source, destination, options } = await fixture(t)
  const id = randomUUID()
  const controller = new AbortController()
  await assert.rejects(
    runStorageCopy(source, destination, id, {
      ...options,
      signal: controller.signal,
      onProgress: ({ files }) => {
        if (files === 1) controller.abort()
      },
    }),
    { name: 'AbortError' },
  )
  await assert.rejects(checkStorage(destination))
  await runStorageCopy(source, destination, id, options)
  await checkStorage(destination)
  assert.equal(
    await readFile(join(destination, 'library/b.bin'), 'utf8'),
    'second game',
  )
  assert.equal(
    await readFile(join(source, 'library/a.bin'), 'utf8'),
    'first game',
  )
  assert.equal((await readdir(destination)).includes(`.romm-copy-${id}`), false)
})

test('a completed copy can finish activation again without deleting later library edits', async (t) => {
  const { source, destination, options } = await fixture(t)
  const id = randomUUID()
  await runStorageCopy(source, destination, id, options)
  await writeFile(join(destination, 'library/a.bin'), 'later edit')
  await runStorageCopy(source, destination, id, options)
  assert.equal(
    await readFile(join(destination, 'library/a.bin'), 'utf8'),
    'later edit',
  )
  await checkStorage(destination)
})

test('retry refuses another job and unexpected destination files', async (t) => {
  const { source, destination, options } = await fixture(t)
  const id = randomUUID()
  const controller = new AbortController()
  await assert.rejects(
    runStorageCopy(source, destination, id, {
      ...options,
      signal: controller.signal,
      onProgress: ({ files }) => {
        if (files === 1) controller.abort()
      },
    }),
    { name: 'AbortError' },
  )
  await assert.rejects(
    runStorageCopy(source, destination, randomUUID(), options),
    /destination must be empty/,
  )
  await writeFile(join(destination, 'keep.bin'), 'user file')
  await assert.rejects(
    runStorageCopy(source, destination, id, options),
    /Unexpected files/,
  )
  assert.equal(
    await readFile(join(destination, 'keep.bin'), 'utf8'),
    'user file',
  )
})

test('copy progress exposes file and byte totals', async (t) => {
  const { source, destination, options } = await fixture(t)
  const updates: { files: number; bytes: number; totalBytes: number }[] = []
  await runStorageCopy(source, destination, randomUUID(), {
    ...options,
    onProgress: (value) => {
      updates.push(value)
    },
  })
  assert.deepEqual(updates.at(-1), { files: 2, bytes: 21, totalBytes: 21 })
})

test('recovery selects retained internal files even with a missing provider and corrupt job', async (t) => {
  const { source } = await fixture(t)
  const saved = {
    libraryStorage: { location: 'nextexplorer', subpath: 'gone' },
    storageMigration: 'broken',
    adminPassword: 'unchanged',
  }
  const recovered = { ...saved, ...(await recoverInternalLibrary(source)) }
  assert.deepEqual(storageState(recovered), {
    active: undefined,
    job: undefined,
  })
  assert.equal(recovered.adminPassword, 'unchanged')
  assert.equal(
    await readFile(join(source, 'library/a.bin'), 'utf8'),
    'first game',
  )
})

test('malformed storage does not poison unrelated settings or silently select a new library', () => {
  const store = z
    .looseObject(storageFields)
    .parse({ libraryStorage: 'broken', primaryUrl: 'https://romm.test' })
  assert.equal(store.primaryUrl, 'https://romm.test')
  assert.equal(store.libraryStorage, 'broken')
  assert.throws(() => storageState(store), /Invalid storage settings/)
})

test('cleanup removes only an inactive internal copy and preserves private files', async (t) => {
  const { source } = await fixture(t)
  await mkdir(join(source, 'assets'))
  await writeFile(join(source, 'assets/save.bin'), 'current save')
  const active = {
    location: 'nextexplorer' as const,
    subpath: 'RomM',
  }
  assert.deepEqual(await retainedLibraries(source, active), ['root'])
  await removeRetainedLibrary(source, 'root', active)
  assert.equal(
    await readFile(join(source, 'assets/save.bin'), 'utf8'),
    'current save',
  )
  await assert.rejects(recoverInternalLibrary(source), /No retained original/)
})

test('cleanup rejects active, pending, unknown and path-traversal selections', async (t) => {
  const { source } = await fixture(t)
  await assert.rejects(removeRetainedLibrary(source, 'root'), /active, missing/)
  const active = { location: 'nextexplorer' as const, subpath: 'RomM' }
  await assert.rejects(
    removeRetainedLibrary(source, '../assets', active),
    /active, missing/,
  )
  await assert.rejects(
    removeRetainedLibrary(source, 'root', active, {
      id: randomUUID(),
      state: 'copying',
      source: active,
      destination: { location: 'internal', subpath: `romm-${randomUUID()}` },
    }),
    /Finish or cancel/,
  )
  assert.equal(
    await readFile(join(source, 'library/a.bin'), 'utf8'),
    'first game',
  )
})

test('cleanup cannot follow a symlinked internal storage parent', async (t) => {
  const { source, destination } = await fixture(t)
  const id = `romm-${randomUUID()}`
  await mkdir(join(destination, id))
  await writeFile(join(destination, id, 'keep.bin'), 'keep')
  await symlink(destination, join(source, 'storage'))
  await assert.rejects(
    removeRetainedLibrary(source, id, {
      location: 'nextexplorer',
      subpath: 'RomM',
    }),
  )
  assert.equal(
    await readFile(join(destination, id, 'keep.bin'), 'utf8'),
    'keep',
  )
})

test('cleanup removes old internal destinations while keeping the active library', async (t) => {
  const { source } = await fixture(t)
  const activeId = `romm-${randomUUID()}`
  const oldId = `romm-${randomUUID()}`
  for (const id of [activeId, oldId]) {
    await mkdir(join(source, 'storage', id), { recursive: true })
    await writeFile(join(source, 'storage', id, 'keep.bin'), id)
  }
  const active = { location: 'internal' as const, subpath: activeId }
  await assert.rejects(removeRetainedLibrary(source, activeId, active))
  await removeRetainedLibrary(source, oldId, active)
  assert.equal(
    await readFile(join(source, 'storage', activeId, 'keep.bin'), 'utf8'),
    activeId,
  )
  assert.deepEqual(await retainedLibraries(source, active), ['root'])
})

test('recovery refuses a symlinked original library', async (t) => {
  const { source, destination } = await fixture(t)
  await rm(join(source, 'library'), { recursive: true })
  await symlink(destination, join(source, 'library'))
  await assert.rejects(recoverInternalLibrary(source), /No retained original/)
})
