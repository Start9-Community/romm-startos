import { sdk } from './sdk'
import { i18n } from './i18n'
import { uiHostId, uiInterfaceId, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const host = sdk.MultiHost.of(effects, uiHostId)
  const origin = await host.bindPort(uiPort, {
    protocol: 'http',
    preferredExternalPort: 80,
  })
  const ui = sdk.createInterface(effects, {
    name: i18n('RomM Web Interface'),
    id: uiInterfaceId,
    description: i18n('Browse, scan, and manage your game library'),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await origin.export([ui])]
})
