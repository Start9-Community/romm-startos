import { type T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { sdk } from './sdk'
import { mountStorage, type StorageMigration } from './storage'
import { copyStorage } from './storageCopy'

export function storageMigrationDaemons(
  effects: T.Effects,
  job: StorageMigration,
) {
  if (job.state === 'failed') {
    throw new Error(
      job.error ||
        'Library storage copy failed. Select an empty destination to retry, or select the current storage to cancel.',
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
        try {
          const result = await copyStorage(
            await sub.subpath('/storage-source'),
            await sub.subpath('/storage-destination'),
            {
              uid: 1000,
              gid: 1000,
              requireMarker: Boolean(job.source),
              signal,
            },
          )
          signal.throwIfAborted()
          console.info(
            `Copied ${result.files} library files (${result.bytes} bytes). Original files retained.`,
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
          const message = `${error instanceof Error ? error.message : String(error)}. Original files and active storage are unchanged. Stop RomM, then select an empty destination to retry or select the current storage to cancel. Partial destination files are retained.`
          await storeJson.merge(
            effects,
            {
              storageMigration: { ...job, state: 'failed', error: message },
            },
            { allowWriteAfterConst: true },
          )
          throw new Error(message)
        }
        return null
      },
    },
    requires: [],
  })
}
