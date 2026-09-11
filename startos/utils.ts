import { type T } from '@start9labs/start-sdk'
import { sdk } from './sdk'

export const uiPort = 8080
export const databasePort = 3306
export const uiHostId = 'ui'
export const uiInterfaceId = 'ui'
export const databaseName = 'romm'
export const databaseUser = 'romm'

export const adminUsername = 'admin'
export const adminEmail = 'admin@example.com'

export const mainMountpoint = '/romm'
export const redisMountpoint = '/redis-data'

export function getUiUrls(effects: T.Effects): Promise<string[]> {
  return sdk.host
    .getOwn(
      effects,
      uiHostId,
      (host) =>
        host?.bindings[uiPort]?.interfaces[
          uiInterfaceId
        ]?.addressInfo.nonLocal.format('urlstring') ?? [],
    )
    .const()
}

export function getPreferredUiUrl(urls: string[]): string {
  return (
    urls.find((url) => url.startsWith('https://') && url.includes('.local')) ??
    urls.find((url) => url.startsWith('https://')) ??
    urls.find((url) => url.includes('.local')) ??
    urls[0] ??
    ''
  )
}
