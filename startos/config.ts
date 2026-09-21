import type { T } from '@start9labs/start-sdk'
import { storeJson } from './fileModels/store.json'
import { migrateConfigFile } from './configMigration'
import { sdk } from './sdk'
import { libraryMounts, privateLibraryMounts } from './storage'

export async function migrateConfig(effects: T.Effects) {
  const store = await storeJson.read().once()
  await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'romm' },
    libraryMounts(store?.libraryStorage),
    'romm-migrate-config',
    async (sub) => {
      if (store?.libraryStorage) await sub.mount(privateLibraryMounts())
      await migrateConfigFile(sub.subpath('/romm'))
    },
  )
}
