import { migrateConfigFile } from './configMigration'
import { sdk } from './sdk'

export const migrateConfig = () => migrateConfigFile(sdk.volumes.main.path)
