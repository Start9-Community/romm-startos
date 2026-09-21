import { migrateConfig } from '../config'
import { sdk } from '../sdk'

export const seedConfig = sdk.setupOnInit(async (effects, kind) => {
  if (kind === 'install') await migrateConfig(effects)
})
