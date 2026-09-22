import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { storageState } from '../storageState'
import { retainedLibraries, removeRetainedLibrary } from '../storageRecovery'

export const cleanupLibraryStorage = sdk.Action.withInput(
  'cleanup-library-storage',
  async () => ({
    name: i18n('Remove Retained Library'),
    description: i18n(
      'Reclaim space used by an inactive internal library copy.',
    ),
    warning: i18n(
      'This permanently deletes the selected retained copy. Verify the active library and keep a backup first. Removing the original disables recovery to that copy.',
    ),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),
  sdk.InputSpec.of({
    copy: sdk.Value.dynamicSelect(async () => {
      const { active, job, privateRoot } = storageState(
        await storeJson.read().once(),
      )
      const copies = job
        ? []
        : await retainedLibraries(
            sdk.volumes.main.path,
            active,
            job,
            privateRoot,
          )
      return {
        name: i18n('Retained Library'),
        values: Object.fromEntries(
          copies.map((id) => [
            id,
            id === 'root'
              ? 'main:library'
              : id.startsWith('private:')
                ? `main:private-storage/${id.slice(8)}`
                : `main:storage/${id}`,
          ]),
        ),
        default: '',
        disabled: copies.length
          ? false
          : i18n('No inactive internal library copies are available.'),
      }
    }),
  }),
  async () => ({}),
  async ({ effects, input }) => {
    const status = await sdk.getStatus(effects).once()
    if (status?.desired.main !== 'stopped' || status.started)
      throw new Error(
        i18n(
          'Stop RomM and wait for it to finish stopping before changing storage.',
        ),
      )
    const { active, job, privateRoot } = storageState(
      await storeJson.read().once(),
    )
    await removeRetainedLibrary(
      sdk.volumes.main.path,
      input.copy,
      active,
      job,
      privateRoot,
    )
    return {
      version: '1',
      title: i18n('Remove Retained Library'),
      message: i18n(
        'The inactive library copy was removed. Active files and private application data were preserved.',
      ),
      result: null,
    }
  },
)
