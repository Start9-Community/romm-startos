import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { requireNoStorageCopy } from '../storageGuard'

const { InputSpec, Value, Variants } = sdk

const disabled = { name: i18n('Disabled'), spec: InputSpec.of({}) }

export const inputSpec = InputSpec.of({
  igdb: Value.union({
    name: i18n('IGDB'),
    description: i18n(
      'The broadest catalogue, and the one RomM matches against first. Register a Twitch application to get a client ID and secret.',
    ),
    default: 'disabled',
    variants: Variants.of({
      disabled,
      enabled: {
        name: i18n('Enabled'),
        spec: InputSpec.of({
          clientId: Value.text({
            name: i18n('Client ID'),
            description: null,
            required: true,
            default: null,
          }),
          clientSecret: Value.text({
            name: i18n('Client Secret'),
            description: null,
            required: true,
            default: null,
            masked: true,
          }),
        }),
      },
    }),
  }),
  mobygames: Value.union({
    name: i18n('MobyGames'),
    description: i18n(
      'Fills in descriptions and credits IGDB often lacks, for older and more obscure titles.',
    ),
    default: 'disabled',
    variants: Variants.of({
      disabled,
      enabled: {
        name: i18n('Enabled'),
        spec: InputSpec.of({
          apiKey: Value.text({
            name: i18n('API Key'),
            description: null,
            required: true,
            default: null,
            masked: true,
          }),
        }),
      },
    }),
  }),
  steamgriddb: Value.union({
    name: i18n('SteamGridDB'),
    description: i18n(
      'Artwork only — cover art, logos and heroes for games the other sources matched.',
    ),
    default: 'disabled',
    variants: Variants.of({
      disabled,
      enabled: {
        name: i18n('Enabled'),
        spec: InputSpec.of({
          apiKey: Value.text({
            name: i18n('API Key'),
            description: null,
            required: true,
            default: null,
            masked: true,
          }),
        }),
      },
    }),
  }),
})

export const configure = sdk.Action.withInput(
  'configure',

  async () => ({
    name: i18n('Configure Metadata Providers'),
    description: i18n(
      'Choose which games databases RomM looks up cover art and metadata from. Without at least one, a scan finds your files but leaves them bare.',
    ),
    warning: i18n('Saving restarts RomM.'),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => {
    const store = await storeJson.read().once()
    return {
      igdb: store?.igdb ?? undefined,
      mobygames: store?.mobygames ?? undefined,
      steamgriddb: store?.steamgriddb ?? undefined,
    }
  },

  // main.ts reads the store reactively, so writing it restarts RomM on its own.
  async ({ effects, input }) => {
    await requireNoStorageCopy()
    await storeJson.merge(effects, input)

    return {
      version: '1',
      title: i18n('Metadata Providers Saved'),
      message: i18n('RomM is restarting with the providers you selected.'),
      result: null,
    }
  },
)
