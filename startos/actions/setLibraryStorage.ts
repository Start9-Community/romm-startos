import { randomUUID } from 'node:crypto'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { checkLibraryStorage } from '../storage'
import {
  storageShape,
  storageMigrationShape,
  storageState,
  storageKey,
} from '../storageState'
import { recoverLibrarySelection } from './recoverLibraryStorage'

const { InputSpec, Value, Variants } = sdk

const folderSpec = InputSpec.of({
  folder: Value.text({
    name: i18n('Folder'),
    description: i18n(
      'An empty folder in the file manager. It becomes a drive in NextExplorer.',
    ),
    required: true,
    default: 'RomM',
    patterns: [
      {
        regex: '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$',
        description: i18n(
          'Use 1 to 80 letters, numbers, hyphens or underscores, starting with a letter or number.',
        ),
      },
    ],
  }),
})

export const inputSpec = InputSpec.of({
  storage: Value.union({
    name: i18n('Library Storage'),
    default: 'internal',
    variants: Variants.of({
      internal: { name: i18n('Internal Storage'), spec: InputSpec.of({}) },
      nextexplorer: { name: 'NextExplorer', spec: folderSpec },
      filebrowser: { name: 'File Browser', spec: folderSpec },
    }),
  }),
})

export const setLibraryStorage = sdk.Action.withInput(
  'set-library-storage',
  async () => ({
    name: i18n('Configure Library Storage'),
    description: i18n(
      'Copy ROM files to a file manager or internal storage. Saves and artwork stay private.',
    ),
    warning: i18n(
      'Back up first. The destination needs space for a full copy. Do not edit files during copying. Shared files require a separate backup of the file manager.',
    ),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),
  inputSpec,
  async () => {
    const parsed = storageShape.safeParse(
      (await storeJson.read().once())?.libraryStorage,
    )
    const storage = parsed.success ? parsed.data : undefined
    return {
      storage:
        storage && storage.location !== 'internal'
          ? { selection: storage.location, value: { folder: storage.subpath } }
          : { selection: 'internal' as const, value: {} },
    }
  },
  async ({ effects, input }) => {
    const status = await sdk.getStatus(effects).once()
    if (status?.desired.main !== 'stopped' || status.started)
      throw new Error(
        i18n(
          'Stop RomM and wait for it to finish stopping before changing storage.',
        ),
      )

    const saved = await storeJson.read().once()
    const location = input.storage.selection
    const parsed = storageShape.optional().safeParse(saved?.libraryStorage)
    if (!parsed.success) {
      if (location === 'internal') return recoverLibrarySelection(effects)
      storageState(saved)
    }
    const source = parsed.success ? parsed.data : undefined
    if (
      (location === 'internal' &&
        (!source || source.location === 'internal')) ||
      (location !== 'internal' &&
        source?.location === location &&
        source.subpath === input.storage.value.folder)
    ) {
      await storeJson.merge(effects, { storageMigration: undefined })
      return {
        version: '1',
        title: i18n('Library Storage Unchanged'),
        message: i18n('RomM already uses the selected storage.'),
        result: null,
      }
    }
    const installed = await sdk.getInstalledPackages(effects)
    if (location !== 'internal' && !installed.includes(location))
      throw new Error(
        i18n('Install the selected file manager before changing storage.'),
      )
    if (source) {
      try {
        if (
          source.location !== 'internal' &&
          !installed.includes(source.location)
        )
          throw new Error(
            i18n('The selected file manager is no longer installed.'),
          )
        await checkLibraryStorage(effects, source)
      } catch (error) {
        if (location === 'internal') return recoverLibrarySelection(effects)
        throw error
      }
    }
    const previous = storageMigrationShape.safeParse(saved?.storageMigration)
    const sameJob =
      previous.success &&
      previous.data.destination.location === location &&
      (location === 'internal' ||
        previous.data.destination.subpath === input.storage.value.folder) &&
      storageKey(previous.data.source) === storageKey(source)
    const destination = sameJob
      ? previous.data.destination
      : storageShape.parse({
          location,
          subpath:
            location === 'internal'
              ? `romm-${randomUUID()}`
              : input.storage.value.folder,
        })
    const job = sameJob
      ? { ...previous.data, state: 'pending' as const, error: undefined }
      : { id: randomUUID(), source, destination, state: 'pending' as const }
    await storeJson.merge(effects, { storageMigration: job })
    return {
      version: '1',
      title: i18n('Library Copy Queued'),
      message: i18n(
        'The storage copy is queued. Start RomM to copy the files before its web interface starts. Original files will be retained. Stop RomM to interrupt the copy.',
      ),
      result: {
        type: 'single',
        name: i18n('Destination Library Folder'),
        description: null,
        value:
          location === 'internal'
            ? `main:storage/${destination.subpath}/library`
            : `${location}:data/${destination.subpath}/library`,
        masked: false,
        copyable: true,
        qr: false,
      },
    }
  },
)
