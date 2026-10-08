import { actions } from '../actions'
import { restoreInit } from '../backups'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { watchPrimaryUrl } from '../primaryUrl'
import { seedStore } from './seedStore'
import { seedConfig } from './seedConfig'
import { watchCredentials } from './watchCredentials'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedStore,
  seedConfig,
  setInterfaces,
  actions,
  dependencies,
  watchCredentials,
  watchPrimaryUrl,
)

export const uninit = sdk.setupUninit(versionGraph)
