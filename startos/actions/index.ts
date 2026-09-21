import { sdk } from '../sdk'
import { configure } from './configure'
import { setAdminPassword } from './setAdminPassword'
import { setPrimaryUrl } from './setPrimaryUrl'
import { setLibraryStorage } from './setLibraryStorage'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(configure)
  .addAction(setPrimaryUrl)
  .addAction(setLibraryStorage)
