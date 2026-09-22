import { actions } from '../actions'
import { restoreInit } from '../backups'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { seedStore } from './seedStore'
import { seedConfig } from './seedConfig'
import { watchCredentials } from './watchCredentials'
import { watchPrimaryUrl } from './watchPrimaryUrl'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedStore,
  seedConfig,
  setInterfaces,
  setDependencies,
  actions,
  watchCredentials,
  watchPrimaryUrl,
)

export const uninit = sdk.setupUninit(versionGraph)
