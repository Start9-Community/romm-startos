import { actions } from '../actions'
import { restoreInit } from '../backups'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { seedStore } from './seedStore'
import { watchCredentials } from './watchCredentials'
import { watchPrimaryUrl } from './watchPrimaryUrl'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedStore,
  setInterfaces,
  setDependencies,
  actions,
  watchCredentials,
  watchPrimaryUrl,
)

export const uninit = sdk.setupUninit(versionGraph)
