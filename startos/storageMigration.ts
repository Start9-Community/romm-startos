import { type T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { mountStorage, type StorageMigration } from './storage'
import { runStorageCopy } from './storageJob'
import { i18n } from './i18n'
import { storageMigrationShape } from './storageState'

export function storageMigrationDaemons(
  effects: T.Effects,
  job: StorageMigration,
) {
  if (job.state === 'failed') {
    throw new Error(
      job.error ||
        i18n(
          'Library copy failed. Stop RomM and use Configure Library Storage to retry, or run Cancel Library Copy.',
        ),
    )
  }
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
        const persisted = await storeJson
          .read((store) => store.storageMigration)
          .once()
        const failed = storageMigrationShape.safeParse(persisted)
        if (failed.success && failed.data.state === 'failed')
          throw new Error(
            failed.data.error ||
              i18n(
                'Library copy failed. Stop RomM and use Configure Library Storage to retry, or run Cancel Library Copy.',
              ),
          )
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
            },
            { allowWriteAfterConst: true },
          )
        } catch (error) {
          if (signal.aborted) throw error
          const detail = error instanceof Error ? error.message : String(error)
          const message = i18n(
            'Library copy failed: ${error}. Original files remain selected. Stop RomM and use Configure Library Storage to retry the same destination, or run Cancel Library Copy.',
            { error: detail },
          )
          await storeJson.merge(
            effects,
            {
              storageMigration: { ...job, state: 'failed', error: message },
            },
            { allowWriteAfterConst: true },
          )
          throw new Error(message)
        } finally {
          clearInterval(timer)
        }
        return null
      },
    },
    requires: [],
  })
}
