import { lstat, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { LibraryStorage, StorageMigration } from './storageState'

async function directories(path: string) {
  const info = await lstat(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  return info?.isDirectory() ? readdir(path) : []
}

export async function retainedLibraries(
  main: string,
  active?: LibraryStorage,
  job?: StorageMigration,
) {
  const protectedIds = new Set(
    [active, job?.source, job?.destination]
      .filter((item) => item?.location === 'internal')
      .map((item) => item!.subpath),
  )
  if (!active || (job && !job.source)) protectedIds.add('root')
  const result: string[] = []
  const root = await lstat(join(main, 'library')).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    },
  )
  if (root?.isDirectory() && !protectedIds.has('root')) result.push('root')
  const names = await directories(join(main, 'storage'))
  for (const name of names) {
    if (!/^romm-[a-f0-9-]{36}$/.test(name) || protectedIds.has(name)) continue
    if ((await lstat(join(main, 'storage', name))).isDirectory())
      result.push(name)
  }
  return result
}

export async function removeRetainedLibrary(
  main: string,
  id: string,
  active?: LibraryStorage,
  job?: StorageMigration,
) {
  if (job)
    throw new Error(
      'Finish or cancel the library copy before removing retained files',
    )
  if (!(await retainedLibraries(main, active, job)).includes(id))
    throw new Error(
      'The selected copy is active, missing, or not managed by RomM',
    )
  const path = id === 'root' ? join(main, 'library') : join(main, 'storage', id)
  await rm(path, { recursive: true })
}

export async function recoverInternalLibrary(main: string) {
  const info = await lstat(join(main, 'library')).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    },
  )
  if (!info?.isDirectory())
    throw new Error(
      'No retained original library is available. Restore a library backup first.',
    )
  return {
    libraryStorage: undefined,
    storageMigration: undefined,
  }
}
