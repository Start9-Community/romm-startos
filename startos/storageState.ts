import { z } from '@start9labs/start-sdk'

export const storageFields = {
  libraryStorage: z.unknown().optional(),
  storageMigration: z.unknown().optional(),
  privateStorage: z.unknown().optional(),
}

export const storageShape = z.object({
  location: z.enum(['internal', 'nextexplorer', 'filebrowser']),
  subpath: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/),
  layout: z.literal('library').optional(),
})

export const storageMigrationShape = z.object({
  id: z.string().uuid(),
  source: storageShape.optional(),
  destination: storageShape,
  state: z.enum(['pending', 'copying', 'failed']),
  error: z.string().optional(),
})

export type LibraryStorage = z.infer<typeof storageShape>
export type StorageMigration = z.infer<typeof storageMigrationShape>

export function storageState(
  store:
    | {
        libraryStorage?: unknown
        storageMigration?: unknown
        privateStorage?: unknown
      }
    | null
    | undefined,
) {
  const active = storageShape.optional().safeParse(store?.libraryStorage)
  const job = storageMigrationShape
    .optional()
    .safeParse(store?.storageMigration)
  const privateRoot = z
    .string()
    .uuid()
    .optional()
    .safeParse(store?.privateStorage)
  if (!active.success || !job.success || !privateRoot.success)
    throw new Error(
      'Invalid storage settings. Stop RomM and use Recover Internal Library or cancel the pending copy in Configure Library Storage.',
    )
  return { active: active.data, job: job.data, privateRoot: privateRoot.data }
}

export function storageKey(storage: LibraryStorage | undefined) {
  return storage ? `${storage.location}:${storage.subpath}` : 'internal:root'
}

export function copyIdentity(
  store: { storageMigration?: unknown } | undefined,
) {
  return store?.storageMigration
}
