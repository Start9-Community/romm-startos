import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import type { T } from '@start9labs/start-sdk'
import { sdk } from '../startos/sdk'
import { storageState, type StorageMigration } from '../startos/storageState'

test(
  'a failed copy persists its error and subsequent starts preserve files until explicitly retried',
  { timeout: 10000 },
  async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'romm-failure-'))
    const source = join(root, 'main')
    const destination = join(root, 'shared')
    await mkdir(join(source, 'library'), { recursive: true })
    await mkdir(destination)
    await writeFile(join(source, 'library/game.bin'), 'original game')
    await writeFile(join(destination, 'existing.bin'), 'unrelated file')
    const originalPath = sdk.volumes.main.path
    Object.defineProperty(sdk.volumes.main, 'path', { value: source })
    const callbacks: (() => void | null | undefined)[] = []
    const daemons: { term(): Promise<unknown> }[] = []
    const effects = {
      eventId: 'retry-library-copy',
      isInContext: true,
      getStatus: async () => ({ desired: { main: 'stopped' }, started: null }),
      getInstalledPackages: async () => ['nextexplorer'],
      onLeaveContext: (callback: () => void | null | undefined) => {
        callbacks.push(callback)
      },
    } as unknown as T.Effects
    const container = {
      subpath: async (path: string) =>
        path === '/storage-source' ? source : destination,
      hold: () => async () => {},
      detach: () => {},
      destroy: async () => {},
    } as unknown as ReturnType<typeof sdk.SubContainer.of>
    t.mock.method(sdk.SubContainer, 'of', () => container)
    t.after(async () => {
      effects.isInContext = false
      for (const daemon of daemons) await daemon.term()
      for (const callback of callbacks) callback()
      Object.defineProperty(sdk.volumes.main, 'path', { value: originalPath })
      await rm(root, { recursive: true, force: true })
    })
    const { storeJson } = await import('../startos/fileModels/store.json.ts')
    const { storageMigrationDaemons } =
      await import('../startos/storageMigration.ts')
    const { setLibraryStorage } =
      await import('../startos/actions/setLibraryStorage.ts')
    const job: StorageMigration = {
      id: randomUUID(),
      destination: { location: 'nextexplorer', subpath: 'RomM' },
      state: 'pending',
    }
    await storeJson.write(effects, {
      adminPassword: 'unchanged-password',
      storageMigration: job,
    })
    const waitForJob = async (state: StorageMigration['state']) => {
      const deadline = Date.now() + 4000
      while (Date.now() < deadline) {
        const store = await storeJson
          .read()
          .once()
          .catch(() => null)
        const saved = storageState(store).job
        if (saved?.state === state) return saved
        await setTimeout(10)
      }
      throw new Error(`The library copy did not reach ${state}`)
    }
    const pending = await storageMigrationDaemons(effects, job).build()
    daemons.push(pending)
    const copying = await waitForJob('copying')
    await pending.term()
    const running = await storageMigrationDaemons(effects, copying).build()
    daemons.push(running)
    const failed = await waitForJob('failed')
    await running.term()
    assert.match(failed.error!, /destination must be empty/)
    assert.equal(failed.id, job.id)
    assert.equal(
      (await storeJson.read().once())?.adminPassword,
      'unchanged-password',
    )
    assert.equal((await storeJson.read().once())?.libraryStorage, undefined)
    assert.equal(
      await readFile(join(destination, 'existing.bin'), 'utf8'),
      'unrelated file',
    )
    await rm(join(destination, 'existing.bin'))
    await writeFile(
      join(source, 'library/game.bin'),
      'source changed after failure',
    )
    for (let restart = 0; restart < 3; restart++) {
      const persisted = storageState(await storeJson.read().once()).job!
      assert.throws(() => storageMigrationDaemons(effects, persisted), {
        message: failed.error,
      })
    }
    let reportError: (error: Error) => void = () => {}
    const reportedError = new Promise<Error>((resolve) => {
      reportError = resolve
    })
    const logger = t.mock.method(console, 'error', (error: unknown) => {
      if (error instanceof Error) reportError(error)
    })
    const stale = await storageMigrationDaemons(effects, copying).build()
    daemons.push(stale)
    const reported = await Promise.race([
      reportedError,
      setTimeout(4000, undefined, { ref: false }).then(() => {
        throw new Error('The saved library-copy failure was not reported')
      }),
    ])
    await stale.term()
    logger.mock.restore()
    assert.equal(reported.message, failed.error)
    assert.deepEqual(await readdir(destination), [])
    assert.equal(
      await readFile(join(source, 'library/game.bin'), 'utf8'),
      'source changed after failure',
    )
    assert.deepEqual(storageState(await storeJson.read().once()).job, failed)
    await setLibraryStorage.getInput({ effects, prefill: null })
    const retry = await setLibraryStorage.run({
      effects,
      input: {
        storage: { selection: 'nextexplorer', value: { folder: 'RomM' } },
      },
    })
    assert.ok(retry?.version === '1')
    assert.equal(retry.title, 'Library Copy Queued')
    assert.deepEqual(storageState(await storeJson.read().once()).job, job)
    const retried = await storageMigrationDaemons(
      effects,
      storageState(await storeJson.read().once()).job!,
    ).build()
    daemons.push(retried)
    const resumed = await waitForJob('copying')
    await retried.term()
    assert.equal(resumed.id, job.id)
    assert.equal(resumed.error, undefined)
  },
)
