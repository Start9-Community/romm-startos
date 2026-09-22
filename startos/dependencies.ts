import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'
import { storageShape, storageMigrationShape } from './storageState'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const selections = await storeJson
    .read((store) => {
      const active = storageShape.safeParse(store.libraryStorage)
      const job = storageMigrationShape.safeParse(store.storageMigration)
      return [
        active.success ? active.data : undefined,
        job.success ? job.data.source : undefined,
        job.success ? job.data.destination : undefined,
      ]
    })
    .const(effects)
  return Object.fromEntries(
    (selections ?? [])
      .filter((storage) => storage && storage.location !== 'internal')
      .map((storage) => [
        storage!.location,
        {
          kind: 'exists' as const,
          versionRange:
            storage!.location === 'filebrowser'
              ? '>=2.62.2:1 || >=#quantum:1.0.0:0'
              : '>=2.2.7:0',
          healthChecks: [],
        },
      ]),
  )
})
