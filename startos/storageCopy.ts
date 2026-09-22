import { constants } from 'node:fs'
import {
  chmod,
  chown,
  copyFile,
  lstat,
  link,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  statfs,
  utimes,
} from 'node:fs/promises'
import { join, relative } from 'node:path'

const directories = ['library']
const markerName = '.romm-storage'

export async function syncStorageDirectory(path: string) {
  const directory = await open(
    path,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  )
  try {
    await directory.sync()
  } finally {
    await directory.close()
  }
}

export async function checkStorage(source: string) {
  const root = await lstat(source)
  const marker = join(source, markerName)
  const info = await lstat(marker).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  if (!root.isDirectory() || !info?.isFile()) {
    throw new Error(
      'The selected storage has not been copied or restored completely',
    )
  }
  const contents = await readFile(marker, 'utf8')
  if (contents !== '1\n' && !/^1\n[a-f0-9-]{36}\n$/.test(contents)) {
    throw new Error('The selected storage marker is invalid')
  }
  const library = await lstat(join(source, 'library')).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    },
  )
  if (library && !library.isDirectory())
    throw new Error(
      'The selected library must be a directory, not a symbolic link',
    )
}

export async function copyStorage(
  source: string,
  destination: string,
  options: {
    uid: number
    gid: number
    requireMarker: boolean
    signal?: AbortSignal
    completionId?: string
    onProgress?: (progress: {
      files: number
      bytes: number
      totalBytes: number
    }) => void | Promise<void>
  },
) {
  if (options.completionId && !/^[a-f0-9-]{36}$/.test(options.completionId))
    throw new Error('Invalid copy identifier')
  options.signal?.throwIfAborted()
  const sourceInfo = await lstat(source)
  const destinationInfo = await lstat(destination)
  if (!sourceInfo.isDirectory() || !destinationInfo.isDirectory()) {
    throw new Error(
      'Both storage roots must be directories, not symbolic links',
    )
  }
  if ((await realpath(source)) === (await realpath(destination))) {
    throw new Error('Source and destination must be different')
  }
  if (options.requireMarker) await checkStorage(source)
  if ((await readdir(destination)).length) {
    throw new Error(
      'The destination must be empty; existing files were left unchanged',
    )
  }

  const entries: { path: string; info: Awaited<ReturnType<typeof lstat>> }[] =
    []
  const presentDirectories = new Set<string>()
  const uniqueFiles = new Map<string, number>()
  async function inspect(path: string) {
    options.signal?.throwIfAborted()
    const info = await lstat(path)
    if (info.isSymbolicLink()) {
      throw new Error(
        `Symbolic links are not supported: ${relative(source, path)}`,
      )
    }
    if (!info.isDirectory() && !info.isFile()) {
      throw new Error(`Unsupported file type: ${relative(source, path)}`)
    }
    entries.push({ path, info })
    if (info.isDirectory()) {
      for (const name of (await readdir(path)).sort())
        await inspect(join(path, name))
    } else {
      uniqueFiles.set(`${info.dev}:${info.ino}`, info.size)
    }
  }

  for (const name of directories) {
    const path = join(source, name)
    const info = await lstat(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    })
    if (info) {
      presentDirectories.add(name)
      await inspect(path)
    }
  }

  const bytes = [...uniqueFiles.values()].reduce((sum, size) => sum + size, 0)
  const space = await statfs(destination, { bigint: true })
  if (space.bavail * space.bsize < BigInt(bytes)) {
    throw new Error(
      'The destination does not have enough free space for the library copy',
    )
  }

  const copied = new Map<string, string>()
  let files = 0
  let copiedBytes = 0
  await options.onProgress?.({ files, bytes: copiedBytes, totalBytes: bytes })
  for (const { path, info } of entries) {
    options.signal?.throwIfAborted()
    const target = join(destination, relative(source, path))
    const current = await lstat(path)
    if (
      current.dev !== info.dev ||
      current.ino !== info.ino ||
      current.mtimeMs !== info.mtimeMs ||
      current.size !== info.size
    ) {
      throw new Error(
        'The source changed during copying; stop editing files and retry',
      )
    }
    if (info.isDirectory()) {
      await mkdir(target, { mode: 0o755 })
    } else {
      const key = `${info.dev}:${info.ino}`
      const existing = copied.get(key)
      if (existing) {
        await link(existing, target)
      } else {
        const input = await open(
          path,
          constants.O_RDONLY | constants.O_NOFOLLOW,
        )
        try {
          const opened = await input.stat()
          if (opened.dev !== info.dev || opened.ino !== info.ino) {
            throw new Error(
              'The source changed during copying; stop editing files and retry',
            )
          }
          await copyFile(
            path,
            target,
            constants.COPYFILE_EXCL | constants.COPYFILE_FICLONE,
          )
          options.signal?.throwIfAborted()
          const after = await input.stat()
          if (after.mtimeMs !== info.mtimeMs || after.size !== info.size) {
            throw new Error(
              'The source changed during copying; stop editing files and retry',
            )
          }
        } finally {
          await input.close()
        }
        copied.set(key, target)
        copiedBytes += info.size
      }
      files++
      await options.onProgress?.({
        files,
        bytes: copiedBytes,
        totalBytes: bytes,
      })
    }
    await chown(target, options.uid, options.gid)
    await chmod(target, info.isDirectory() ? 0o755 : 0o644)
  }

  for (const { path, info } of [...entries].reverse()) {
    options.signal?.throwIfAborted()
    const target = join(destination, relative(source, path))
    await utimes(target, info.atime, info.mtime)
    const copied = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      await copied.sync()
    } finally {
      await copied.close()
    }
  }
  for (const { path, info } of entries) {
    options.signal?.throwIfAborted()
    const current = await lstat(path)
    if (
      current.dev !== info.dev ||
      current.ino !== info.ino ||
      current.mtimeMs !== info.mtimeMs ||
      current.size !== info.size
    ) {
      throw new Error(
        'The source changed during copying; stop editing files and retry',
      )
    }
  }
  for (const name of directories) {
    if (!presentDirectories.has(name)) {
      const appeared = await lstat(join(source, name)).catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code === 'ENOENT') return undefined
          throw error
        },
      )
      if (appeared)
        throw new Error(
          'The source changed during copying; stop editing files and retry',
        )
    }
  }
  await chown(destination, options.uid, options.gid)
  await chmod(destination, 0o755)
  const marker = join(destination, markerName)
  options.signal?.throwIfAborted()
  const file = await open(marker, 'wx', 0o644)
  try {
    await file.writeFile(
      options.completionId ? `1\n${options.completionId}\n` : '1\n',
    )
    await file.chown(options.uid, options.gid)
    await file.chmod(0o644)
    await file.sync()
  } finally {
    await file.close()
  }
  await syncStorageDirectory(destination)
  return { files, bytes }
}
