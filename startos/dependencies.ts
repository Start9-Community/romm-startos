import { type T } from '@start9labs/start-sdk'
import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'
import { storageShape, storageMigrationShape } from './storageState'

async function storageProviderEnabled(
  provider: 'nextexplorer' | 'filebrowser',
  effects: T.Effects,
) {
  return (
    (await storeJson
      .read((store) => {
        const active = storageShape.safeParse(store.libraryStorage)
        const job = storageMigrationShape.safeParse(store.storageMigration)
        return [
          active.success ? active.data : undefined,
          job.success ? job.data.source : undefined,
          job.success ? job.data.destination : undefined,
        ].some((storage) => storage?.location === provider)
      })
      .const(effects)) ?? false
  )
}

export const dependencies = sdk.Dependencies.of()
  .addDependency(
    sdk.Dependency.optional('nextexplorer', {
      description: { en_US: 'Optional shared storage for the RomM library.' },
      metadata: {
        title: { en_US: 'NextExplorer' },
        icon: 'https://raw.githubusercontent.com/Start9Labs/nextexplorer-startos/853598c02f5604fb5f092420e68e7a7e68a50720/icon.svg',
      },
      kind: 'exists',
      versionRange: '>=2.2.7:0',
      enabled: ({ effects }) => storageProviderEnabled('nextexplorer', effects),
    }),
  )
  .addDependency(
    sdk.Dependency.optional('filebrowser', {
      description: { en_US: 'Optional shared storage for the RomM library.' },
      metadata: {
        title: { en_US: 'File Browser' },
        icon: 'https://raw.githubusercontent.com/Start9Labs/filebrowser-startos/b4f782cdc3ce629744d7948a240e591795d0dca8/icon.svg',
      },
      kind: 'exists',
      versionRange: '>=2.62.2:1 || >=#quantum:1.0.0:0',
      enabled: ({ effects }) => storageProviderEnabled('filebrowser', effects),
    }),
  )
