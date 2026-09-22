import { T } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { recoverInternalLibrary } from '../storageRecovery'

export async function recoverLibrarySelection(
  effects: T.Effects,
): Promise<Extract<T.ActionResult, { version: '1' }>> {
  const patch = await recoverInternalLibrary(sdk.volumes.main.path)
  await storeJson.merge(effects, patch)
  return {
    version: '1',
    title: i18n('Recover Internal Library'),
    message: i18n(
      'The retained original library at main:library is selected. Later changes in the file manager or newer retained copies are not included.',
    ),
    result: {
      type: 'single',
      value: 'main:library',
      masked: false,
      copyable: true,
      qr: false,
    },
  }
}

export const recoverLibraryStorage = sdk.Action.withoutInput(
  'recover-library-storage',
  async () => ({
    name: i18n('Recover Internal Library'),
    description: i18n(
      'Select the retained original library at main:library without accessing the file manager.',
    ),
    warning: i18n(
      'Recovery uses the original library at main:library. Later changes in the file manager or newer retained copies are not included.',
    ),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    const status = await sdk.getStatus(effects).once()
    if (status?.desired.main !== 'stopped' || status.started)
      throw new Error(
        i18n(
          'Stop RomM and wait for it to finish stopping before changing storage.',
        ),
      )
    return recoverLibrarySelection(effects)
  },
)
