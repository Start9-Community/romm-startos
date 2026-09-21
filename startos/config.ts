import type { T } from '@start9labs/start-sdk'
import { migrateConfigFile } from './configMigration'
import { sdk } from './sdk'
import { mainMountpoint } from './utils'

export async function migrateConfig(effects: T.Effects) {
  await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'romm' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: mainMountpoint,
      readonly: false,
    }),
    'romm-migrate-config',
    async (sub) => {
      await migrateConfigFile(sub.subpath('/romm'))
    },
  )
}
