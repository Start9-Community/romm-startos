import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getPreferredUiUrl, getUiUrls } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  url: Value.dynamicSelect(async ({ effects }) => {
    const urls = await getUiUrls(effects)

    return {
      name: i18n('URL'),
      values: Object.fromEntries(urls.map((url) => [url, url])),
      default: '',
      disabled:
        urls.length > 0
          ? false
          : i18n('No RomM interface URL is currently available.'),
    }
  }),
})

export const setPrimaryUrl = sdk.Action.withInput(
  'set-primary-url',
  async () => ({
    name: i18n('Set Primary URL'),
    description: i18n(
      'Choose the URL RomM should use for invite and password-reset links.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async ({ effects }) => {
    const urls = await getUiUrls(effects)
    const primaryUrl =
      (await storeJson.read((store) => store.primaryUrl).once()) ?? ''

    return {
      url: urls.includes(primaryUrl)
        ? primaryUrl
        : getPreferredUiUrl(urls) || undefined,
    }
  },
  async ({ effects, input }) => {
    const urls = await getUiUrls(effects)
    if (!input.url || !urls.includes(input.url)) {
      throw new Error('Selected RomM URL is no longer available')
    }

    await storeJson.merge(effects, { primaryUrl: input.url })

    return {
      version: '1',
      title: i18n('Primary URL Saved'),
      message: i18n(
        'RomM will use ${url} for invite and password-reset links.',
        { url: input.url },
      ),
      result: null,
    }
  },
)
