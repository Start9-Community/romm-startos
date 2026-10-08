import { migrateConfigFile } from './configMigration'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const uiPort = 8080
export const databasePort = 3306
export const uiHostId = 'ui'
export const uiInterfaceId = 'ui'
export const databaseName = 'romm'
export const databaseUser = 'romm'

export const adminUsername = 'admin'
export const adminEmail = 'admin@example.com'

export const mainMountpoint = '/romm'
export const redisMountpoint = '/redis-data'

export const migrateConfig = () => migrateConfigFile(sdk.volumes.main.path)

export async function requireNoStorageCopy() {
  if ((await storeJson.read().once())?.storageMigration)
    throw new Error(
      i18n('Finish or cancel the library copy before changing settings.'),
    )
}
