import { constants } from 'node:fs'
import {
  chmod,
  chown,
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

const directories = ['library', 'assets', 'resources', 'launchbox']
const markerName = '.romm-storage'

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
  if ((await readFile(marker, 'utf8')) !== '1\n') {
    throw new Error('The selected storage marker is invalid')
  }
}

export async function copyStorage(
  source: string,
  destination: string,
  options: {
    uid: number
    gid: number
    requireMarker: boolean
    signal?: AbortSignal
  },
) {
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
          const output = await open(target, 'wx', 0o644)
          try {
            const buffer = Buffer.alloc(1024 * 1024)
            let read = await input.read(buffer)
            while (read.bytesRead) {
              options.signal?.throwIfAborted()
              let written = 0
              while (written < read.bytesRead) {
                const result = await output.write(
                  buffer,
                  written,
                  read.bytesRead - written,
                )
                written += result.bytesWritten
              }
              read = await input.read(buffer)
            }
            await output.sync()
          } finally {
            await output.close()
          }
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
      }
      files++
    }
    await chown(target, options.uid, options.gid)
    await chmod(target, info.isDirectory() ? 0o755 : 0o644)
  }

  for (const { path, info } of [...entries].reverse()) {
    options.signal?.throwIfAborted()
    await utimes(
      join(destination, relative(source, path)),
      info.atime,
      info.mtime,
    )
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
    await file.writeFile('1\n')
    await file.sync()
  } finally {
    await file.close()
  }
  await chown(marker, options.uid, options.gid)
  await chmod(marker, 0o644)
  return { files, bytes }
}
