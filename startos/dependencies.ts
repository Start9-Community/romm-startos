import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const selections = await storeJson
    .read((store) => [
      store.libraryStorage,
      store.storageMigration?.source,
      store.storageMigration?.destination,
    ])
    .const(effects)
  return Object.fromEntries(
    (selections ?? [])
      .filter((storage) => storage && storage.location !== 'internal')
      .map((storage) => [
        storage!.location,
        {
          kind: 'exists' as const,
          versionRange: '*',
          healthChecks: [],
        },
      ]),
  )
})
