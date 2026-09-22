import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const cancelLibraryCopy = sdk.Action.withoutInput(
  'cancel-library-copy',
  async ({ effects }) => ({
    name: i18n('Cancel Library Copy'),
    description: i18n(
      'Cancel the queued, interrupted, or failed copy. The current library stays selected.',
    ),
    warning: i18n('Partial destination files will be retained.'),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: (await storeJson
      .read((store) => store?.storageMigration !== undefined)
      .const(effects))
      ? 'enabled'
      : 'hidden',
  }),
  async ({ effects }) => {
    const status = await sdk.getStatus(effects).once()
    if (status?.desired.main !== 'stopped' || status.started)
      throw new Error(
        i18n(
          'Stop RomM and wait for it to finish stopping before changing storage.',
        ),
      )
    await storeJson.merge(effects, { storageMigration: undefined })
    return {
      version: '1',
      title: i18n('Cancel Library Copy'),
      message: i18n(
        'The pending copy was cancelled. RomM will keep using its current storage. Partial destination files were retained.',
      ),
      result: null,
    }
  },
)
