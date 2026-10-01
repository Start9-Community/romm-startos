import { migrateConfig } from '../utils'
import { sdk } from '../sdk'

export const seedConfig = sdk.setupOnInit(async (_effects, kind) => {
  if (kind === 'install') await migrateConfig()
})
