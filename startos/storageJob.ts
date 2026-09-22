import {
  chmod,
  chown,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
} from 'node:fs/promises'
import { join } from 'node:path'
import { copyStorage, checkStorage, syncStorageDirectory } from './storageCopy'

export async function runStorageCopy(
  source: string,
  destination: string,
  id: string,
  options: Parameters<typeof copyStorage>[2],
) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid copy identifier')
  options.signal?.throwIfAborted()
  const root = await lstat(destination)
  if (!root.isDirectory()) throw new Error('Destination must be a directory')
  const ownerName = `.romm-copy-job-${id}`
  const owner = join(destination, ownerName)
  const stage = join(destination, `.romm-copy-${id}`)
  const published = join(destination, '.romm-publish')
  const marker = join(destination, '.romm-storage')
  const completion = await lstat(marker).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    },
  )
  async function finish() {
    await checkStorage(destination)
    await chown(destination, options.uid, options.gid)
    await chmod(destination, 0o755)
    await syncStorageDirectory(destination)
    await rm(stage, { recursive: true, force: true })
    await rm(published, { force: true })
    await rm(owner, { recursive: true, force: true })
    await syncStorageDirectory(destination)
  }
  if (
    completion?.isFile() &&
    (await readFile(marker, 'utf8')) === `1\n${id}\n`
  ) {
    await finish()
    return
  }
  const existing = await lstat(owner).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  if (existing) {
    if (!existing.isDirectory())
      throw new Error('The destination belongs to a different copy job')
  } else {
    if ((await readdir(destination)).length)
      throw new Error(
        'The destination must be empty; existing files were left unchanged',
      )
    await mkdir(owner, { mode: 0o700 })
    await syncStorageDirectory(destination)
  }
  const names = ['library']
  const publication = await lstat(published).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    },
  )
  if (publication) {
    if (!publication.isFile())
      throw new Error('Invalid copy publication record')
    const records = JSON.parse(await readFile(published, 'utf8')) as Record<
      string,
      { dev: number; ino: number }
    >
    for (const name of [...names, '.romm-storage']) {
      const sourcePath = join(stage, name)
      const target = join(destination, name)
      const info = await lstat(target).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined
        throw error
      })
      const expected = records[name]
      if (!expected) continue
      if (info) {
        if (info.dev !== expected.dev || info.ino !== expected.ino)
          throw new Error(
            'Destination files changed while the copy was interrupted',
          )
      } else {
        const staged = await lstat(sourcePath)
        if (staged.dev !== expected.dev || staged.ino !== expected.ino)
          throw new Error('Staged files changed while the copy was interrupted')
        await rename(sourcePath, target)
      }
      await syncStorageDirectory(stage)
      await syncStorageDirectory(destination)
    }
    if ((await readFile(marker, 'utf8')) !== `1\n${id}\n`)
      throw new Error('The completion marker belongs to a different copy job')
    await finish()
    return
  }
  const permitted = new Set([
    ownerName,
    `.romm-copy-${id}`,
    `.romm-publish-${id}`,
  ])
  if ((await readdir(destination)).some((name) => !permitted.has(name)))
    throw new Error(
      'Unexpected files in the copy destination; nothing was removed',
    )
  await rm(stage, { recursive: true, force: true })
  await rm(join(destination, `.romm-publish-${id}`), { force: true })
  await mkdir(stage)
  await copyStorage(source, stage, { ...options, completionId: id })
  options.signal?.throwIfAborted()
  const records: Record<string, { dev: number; ino: number }> = {}
  for (const name of [...names, '.romm-storage']) {
    const info = await lstat(join(stage, name)).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined
        throw error
      },
    )
    if (info) records[name] = { dev: info.dev, ino: info.ino }
  }
  const temp = join(destination, `.romm-publish-${id}`)
  const file = await open(temp, 'wx', 0o600)
  try {
    await file.writeFile(JSON.stringify(records))
    await file.sync()
  } finally {
    await file.close()
  }
  await rename(temp, published)
  await syncStorageDirectory(destination)
  await runStorageCopy(source, destination, id, options)
}
