import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { requireNoStorageCopy, uiHostId, uiInterfaceId, uiPort } from './utils'

export const primaryUrl = sdk.setupPrimaryUrl({
  id: 'set-primary-url',
  hostId: uiHostId,
  interfaceId: uiInterfaceId,
  metadata: {
    name: i18n('Set Primary URL'),
    description: i18n(
      'Choose the URL RomM should use for invite and password-reset links.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  field: { name: i18n('URL'), description: null },
  get: storeJson.read((store) => store.primaryUrl),
  set: async (effects, url) => {
    await requireNoStorageCopy()
    const urls = await sdk.host
      .getOwn(
        effects,
        uiHostId,
        (host) =>
          host?.bindings[uiPort]?.interfaces[
            uiInterfaceId
          ]?.addressInfo.nonLocal.format('urlstring') ?? [],
      )
      .once()
    if (!urls.includes(url))
      throw new Error('Selected RomM URL is no longer available')
    await storeJson.merge(effects, { primaryUrl: url })
  },
})

const selectionTask = primaryUrl.setupTask('important', {
  reason: i18n(
    'Choose the URL RomM should use for invite and password-reset links.',
  ),
})

export const watchPrimaryUrl = sdk.setupOnInit(
  async (effects, kind, progress) => {
    const copying = await storeJson
      .read((store) => Boolean(store.storageMigration))
      .const(effects)
    if (copying) return
    await selectionTask.init(effects, kind, progress)
  },
)
