import { randomUUID } from 'node:crypto'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { storageShape } from '../storage'

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
      'Copy your library and artwork into NextExplorer, File Browser including Quantum, or internal storage. Original files are retained.',
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
    const storage = (await storeJson.read().once())?.libraryStorage
    return {
      storage:
        storage && storage.location !== 'internal'
          ? { selection: storage.location, value: { folder: storage.subpath } }
          : { selection: 'internal' as const, value: {} },
    }
  },
  async ({ effects, input }) => {
    const status = await sdk.getStatus(effects).once()
    if (status?.desired.main !== 'stopped' || status.started) {
      throw new Error(
        i18n(
          'Stop RomM and wait for it to finish stopping before changing storage.',
        ),
      )
    }

    const saved = await storeJson.read().once()
    const source = saved?.libraryStorage
    const location = input.storage.selection
    const subpath =
      location === 'internal'
        ? `romm-${randomUUID()}`
        : input.storage.value.folder
    if (
      (location === 'internal' &&
        (!source || source.location === 'internal')) ||
      (source?.location === location && source.subpath === subpath)
    ) {
      await storeJson.merge(effects, { storageMigration: undefined })
      return {
        version: '1',
        title: i18n('Library Storage Unchanged'),
        message: saved?.storageMigration
          ? i18n(
              'The pending copy was cancelled. RomM will keep using its current storage. Partial destination files were retained.',
            )
          : i18n('RomM already uses the selected storage.'),
        result: null,
      }
    }

    const destination = storageShape.parse({ location, subpath })
    const installed = await sdk.getInstalledPackages(effects)
    for (const storage of [source, destination]) {
      if (
        storage &&
        storage.location !== 'internal' &&
        !installed.includes(storage.location)
      ) {
        throw new Error(
          i18n('Install the selected file manager before changing storage.'),
        )
      }
    }

    await storeJson.merge(effects, {
      storageMigration: { source, destination, state: 'pending' },
    })
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
            ? `main:storage/${subpath}/library`
            : `${location}:data/${subpath}/library`,
        masked: false,
        copyable: true,
        qr: false,
      },
    }
  },
)
