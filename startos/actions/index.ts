import { sdk } from '../sdk'
import { configure } from './configure'
import { setAdminPassword } from './setAdminPassword'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(configure)
