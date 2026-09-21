import type { manifest as filebrowserManifest } from 'filebrowser-startos/startos/manifest'
import type { manifest as nextexplorerManifest } from 'nextexplorer-startos/startos/manifest'
import { type T, z } from '@start9labs/start-sdk'
import { sdk } from './sdk'
import { mainMountpoint, redisMountpoint } from './utils'
import { checkStorage } from './storageCopy'

export const storageShape = z.object({
  location: z.enum(['internal', 'nextexplorer', 'filebrowser']),
  subpath: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/),
})

export type LibraryStorage = z.infer<typeof storageShape>

export const storageMigrationShape = z.object({
  source: storageShape.optional(),
  destination: storageShape,
  state: z.enum(['pending', 'failed']),
  error: z.string().optional(),
})

export type StorageMigration = z.infer<typeof storageMigrationShape>

export function mountStorage(
  mounts: ReturnType<typeof sdk.Mounts.of>,
  storage: LibraryStorage | undefined,
  mountpoint: string,
  readonly: boolean,
  remap = false,
) {
  if (!storage || storage.location === 'internal') {
    return mounts.mountVolume({
      volumeId: 'main',
      subpath: storage ? `storage/${storage.subpath}` : null,
      mountpoint,
      readonly,
    })
  }

  return mounts.mountDependency<
    typeof nextexplorerManifest | typeof filebrowserManifest
  >({
    dependencyId: storage.location,
    volumeId: 'data',
    subpath: storage.subpath,
    mountpoint,
    readonly,
    ...(remap && {
      idmap: [{ fromId: 1000, toId: 0 }],
    }),
  })
}

export function libraryMounts(storage: LibraryStorage | undefined) {
  return mountStorage(
    sdk.Mounts.of(),
    storage,
    mainMountpoint,
    false,
    true,
  ).mountVolume({
    volumeId: 'main',
    subpath: 'redis-data',
    mountpoint: redisMountpoint,
    readonly: false,
  })
}

export function privateLibraryMounts() {
  let mounts = sdk.Mounts.of()
  for (const subpath of ['config', 'sync']) {
    mounts = mounts.mountVolume({
      volumeId: 'main',
      subpath,
      mountpoint: `${mainMountpoint}/${subpath}`,
      readonly: false,
    })
  }

  return mounts
}

export async function checkLibraryStorage(
  effects: T.Effects,
  storage: LibraryStorage | undefined,
) {
  if (!storage) return
  await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'romm' },
    mountStorage(sdk.Mounts.of(), storage, '/storage-source', true),
    'romm-check-storage',
    async (sub) => checkStorage(await sub.subpath('/storage-source')),
  )
}
