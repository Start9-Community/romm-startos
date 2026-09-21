import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { storageMigrationShape, storageShape } from '../storage'

const provider = <T extends z.ZodRawShape>(value: T) =>
  z
    .discriminatedUnion('selection', [
      z.object({ selection: z.literal('disabled') }),
      z.object({ selection: z.literal('enabled'), value: z.object(value) }),
    ])
    .optional()
    .catch(undefined)

const shape = z.looseObject({
  databaseRootPassword: z.string().optional().catch(undefined),
  databasePassword: z.string().optional().catch(undefined),
  authSecret: z.string().optional().catch(undefined),
  adminPassword: z.string().optional().catch(undefined),
  primaryUrl: z.string().optional().catch(undefined),
  libraryStorage: storageShape.optional(),
  storageMigration: storageMigrationShape.optional(),
  igdb: provider({ clientId: z.string(), clientSecret: z.string() }),
  mobygames: provider({ apiKey: z.string() }),
  steamgriddb: provider({ apiKey: z.string() }),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './store.json' },
  shape,
)
