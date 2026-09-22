import { setPrimaryUrl } from '../actions/setPrimaryUrl'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getPreferredUiUrl, getUiUrls } from '../utils'

const taskReplayId = 'romm:set-primary-url'

export const watchPrimaryUrl = sdk.setupOnInit(async (effects) => {
  const copying = await storeJson
    .read((store) => Boolean(store.storageMigration))
    .const(effects)
  if (copying) return
  const urls = await getUiUrls(effects)
  const primaryUrl = await storeJson
    .read((store) => store.primaryUrl)
    .const(effects)

  if (!primaryUrl) {
    const preferredUrl = getPreferredUiUrl(urls)
    if (preferredUrl) {
      await storeJson.merge(
        effects,
        { primaryUrl: preferredUrl },
        { allowWriteAfterConst: true },
      )
      await sdk.action.clearTask(effects, taskReplayId)
    } else {
      await sdk.action.createOwnTask(effects, setPrimaryUrl, 'important', {
        reason: i18n(
          'No RomM interface URL is available. Enable an address, then select a Primary URL.',
        ),
      })
    }
    return
  }

  if (!urls.includes(primaryUrl)) {
    await sdk.action.createOwnTask(effects, setPrimaryUrl, 'important', {
      reason: i18n(
        'The selected Primary URL is no longer available. Choose another URL.',
      ),
    })
    return
  }

  await sdk.action.clearTask(effects, taskReplayId)
})
