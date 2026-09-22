import { type T } from '@start9labs/start-sdk'
import { mkdir } from 'node:fs/promises'
import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { mountStorage, type StorageMigration } from './storage'
import { runStorageCopy } from './storageJob'
import { i18n } from './i18n'

export function storageMigrationDaemons(
  effects: T.Effects,
  job: StorageMigration,
) {
  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'romm' },
    mountStorage(
      mountStorage(sdk.Mounts.of(), job.source, '/storage-source', true),
      job.destination,
      '/storage-destination',
      false,
    ),
    'romm-copy-storage',
  )
  return sdk.Daemons.of(effects).addOneshot('library-storage-copy', {
    subcontainer,
    exec: {
      fn: async (sub, signal) => {
        if (job.state !== 'copying') {
          await storeJson.merge(
            effects,
            {
              storageMigration: { ...job, state: 'copying', error: undefined },
            },
            { allowWriteAfterConst: true },
          )
          return null
        }
        let progress = { files: 0, bytes: 0, totalBytes: 0 }
        const report = () =>
          console.info(
            i18n(
              'Copying library: ${files} files, ${bytes} of ${total} bytes.',
              {
                files: String(progress.files),
                bytes: String(progress.bytes),
                total: String(progress.totalBytes),
              },
            ),
          )
        const timer = setInterval(report, 10000)
        report()
        try {
          const source = await sub.subpath('/storage-source')
          const options = {
            uid: 1000,
            gid: 1000,
            requireMarker: Boolean(job.source),
            signal,
            onProgress: (value: typeof progress) => {
              progress = value
            },
          }
          const legacy = job.source && job.source.layout !== 'library'
          if (legacy) {
            const destination = sdk.volumes.main.subpath(
              `private-storage/${job.id}`,
            )
            await mkdir(destination, { recursive: true })
            await runStorageCopy(source, destination, job.id, {
              ...options,
              directories: ['assets', 'resources', 'launchbox'],
            })
          }
          await runStorageCopy(
            source,
            await sub.subpath('/storage-destination'),
            job.id,
            options,
          )
          signal.throwIfAborted()
          report()
          console.info(
            i18n('Library copy completed. Original files were retained.'),
          )
          await storeJson.merge(
            effects,
            {
              libraryStorage: job.destination,
              storageMigration: undefined,
              ...(legacy ? { privateStorage: job.id } : {}),
            },
            { allowWriteAfterConst: true },
          )
        } catch (error) {
          if (signal.aborted) throw error
          const detail = error instanceof Error ? error.message : String(error)
          throw new Error(
            i18n(
              'Library copy failed: ${error}. Original files remain selected. Restart to retry, or stop RomM and cancel the copy in Configure Library Storage.',
              { error: detail },
            ),
          )
        } finally {
          clearInterval(timer)
        }
        return null
      },
    },
    requires: [],
  })
}
