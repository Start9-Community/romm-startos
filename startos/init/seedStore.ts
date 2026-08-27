import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

const secret = () => utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 64 })

export const seedStore = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return

  await storeJson.merge(effects, {
    databaseRootPassword: secret(),
    databasePassword: secret(),
    authSecret: secret(),
  })
})
