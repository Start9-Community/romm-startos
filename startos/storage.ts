import type { manifest as filebrowserManifest } from 'filebrowser-startos/startos/manifest'
import type { manifest as nextexplorerManifest } from 'nextexplorer-startos/startos/manifest'
import { type T } from '@start9labs/start-sdk'
import { sdk } from './sdk'
import { mainMountpoint, redisMountpoint } from './utils'
import { checkStorage } from './storageCopy'
import type { LibraryStorage } from './storageState'
export { storageShape, storageMigrationShape } from './storageState'
export type { LibraryStorage, StorageMigration } from './storageState'

export function mountStorage(
  mounts: ReturnType<typeof sdk.Mounts.of>,
  storage: LibraryStorage | undefined,
  mountpoint: string,
  readonly: boolean,
  remap = false,
  libraryOnly = false,
) {
  if (!storage || storage.location === 'internal') {
    return mounts.mountVolume({
      volumeId: 'main',
      subpath: storage
        ? `storage/${storage.subpath}${libraryOnly ? '/library' : ''}`
        : libraryOnly
          ? 'library'
          : null,
      mountpoint,
      readonly,
    })
  }

  return mounts.mountDependency<
    typeof nextexplorerManifest | typeof filebrowserManifest
  >({
    dependencyId: storage.location,
    volumeId: 'data',
    subpath: `${storage.subpath}${libraryOnly ? '/library' : ''}`,
    mountpoint,
    readonly,
    ...(remap && {
      idmap: [{ fromId: 1000, toId: 0 }],
    }),
  })
}

export function libraryMounts(storage: LibraryStorage | undefined) {
  if (!storage || storage.layout === 'library') {
    return sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: mainMountpoint,
        readonly: false,
      })
      .mountVolume({
        volumeId: 'main',
        subpath: 'redis-data',
        mountpoint: redisMountpoint,
        readonly: false,
      })
  }
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

export function selectedLibraryMount(storage: LibraryStorage) {
  return mountStorage(
    sdk.Mounts.of(),
    storage,
    `${mainMountpoint}/library`,
    false,
    true,
    true,
  )
}

export function privateDataMounts(id: string) {
  let mounts = sdk.Mounts.of()
  for (const name of ['assets', 'resources', 'launchbox'])
    mounts = mounts.mountVolume({
      volumeId: 'main',
      subpath: `private-storage/${id}/${name}`,
      mountpoint: `${mainMountpoint}/${name}`,
      readonly: false,
    })
  return mounts
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
