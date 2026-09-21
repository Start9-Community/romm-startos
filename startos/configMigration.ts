import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { type Document, parseDocument } from 'yaml'

function mapping(value: unknown, name: string): Record<string, unknown> {
  if (value === null || value === undefined) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be a mapping; config.yml was not changed`)
  }
  return value as Record<string, unknown>
}

function folderName(value: unknown, name: string, fallback: string): string {
  if (value === null || value === undefined) return fallback
  if (typeof value !== 'string' || !value) {
    throw new Error(`${name} must be a non-empty relative folder name`)
  }
  if (
    value
      .split('/')
      .some((part) => ['', '.', '..'].includes(part) || /[{}]/.test(part))
  ) {
    throw new Error(`${name} cannot be converted safely to a library template`)
  }
  return value
}

function missing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT'
}

async function isDirectory(filename: string): Promise<boolean> {
  try {
    return (await fs.stat(filename)).isDirectory()
  } catch (error) {
    if (missing(error) || (error as NodeJS.ErrnoException).code === 'ENOTDIR') {
      return false
    }
    throw error
  }
}

export async function migrateConfigFile(root: string): Promise<boolean> {
  const configPath = path.join(root, 'config', 'config.yml')
  const oldStat = await fs.lstat(configPath).catch((error: unknown) => {
    if (missing(error)) return undefined
    throw error
  })
  if (oldStat && !oldStat.isFile()) {
    throw new Error('config.yml must be a regular file before upgrading')
  }
  const original = oldStat ? await fs.readFile(configPath, 'utf8') : undefined
  const document: Document = parseDocument(original ?? '')
  if (document.errors.length) {
    throw new Error(
      'config.yml is invalid YAML; the configuration was not changed',
    )
  }
  const loaded = document.toJS()
  const config = mapping(loaded, 'config.yml')
  const filesystem = mapping(config.filesystem, 'filesystem')
  const structure = mapping(filesystem.structure, 'filesystem.structure')
  const roms = folderName(
    filesystem.roms_folder,
    'filesystem.roms_folder',
    'roms',
  )
  const bios = folderName(
    filesystem.firmware_folder,
    'filesystem.firmware_folder',
    'bios',
  )
  const library = path.join(root, 'library')
  let nested = false
  if (
    (await isDirectory(library)) &&
    !(await isDirectory(path.join(library, roms)))
  ) {
    for (const platform of await fs.readdir(library)) {
      if (await isDirectory(path.join(library, platform, roms))) {
        nested = true
        break
      }
    }
  }
  const patterns = {
    default: nested ? `{platform}/${roms}/{game}` : `${roms}/{platform}/{game}`,
    firmware: nested ? `{platform}/${bios}` : `${bios}/{platform}`,
  }
  const fields = [
    ['roms_folder', 'default'],
    ['firmware_folder', 'firmware'],
  ] as const
  for (const [retired, key] of fields) {
    if (
      filesystem[retired] !== null &&
      filesystem[retired] !== undefined &&
      key in structure &&
      structure[key] !== patterns[key]
    ) {
      throw new Error(
        `filesystem.${retired} conflicts with filesystem.structure.${key}; ` +
          'resolve the library layout before upgrading; config.yml was not changed',
      )
    }
  }
  if (
    fields.every(
      ([retired, key]) => !(retired in filesystem) && key in structure,
    )
  ) {
    return false
  }
  if (loaded === null) document.contents = document.createNode({})
  if (config.filesystem === null) {
    document.set('filesystem', document.createNode({}))
  }
  if (filesystem.structure === null)
    document.setIn(['filesystem', 'structure'], document.createNode({}))
  for (const [retired, key] of fields) {
    if (!(key in structure)) {
      document.setIn(['filesystem', 'structure', key], patterns[key])
    }
    document.deleteIn(['filesystem', retired])
  }
  const rendered = document.toString()
  await fs.mkdir(path.dirname(configPath), { recursive: true })
  if (original !== undefined) {
    const backup = `${configPath}.pre-5.3.0`
    try {
      const saved = await fs.open(backup, 'wx', 0o600)
      try {
        await saved.writeFile(original)
        await saved.sync()
      } finally {
        await saved.close()
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (!(await fs.lstat(backup)).isFile()) {
        throw new Error(
          'The original configuration backup is not a regular file',
        )
      }
    }
  }
  const temporary = path.join(
    path.dirname(configPath),
    `.config.yml-${randomUUID()}`,
  )
  try {
    const output = await fs.open(
      temporary,
      'wx',
      oldStat ? oldStat.mode & 0o777 : 0o600,
    )
    try {
      if (oldStat) await output.chown(oldStat.uid, oldStat.gid)
      await output.writeFile(rendered)
      await output.sync()
    } finally {
      await output.close()
    }
    await fs.rename(temporary, configPath)
  } finally {
    await fs.unlink(temporary).catch((error: unknown) => {
      if (!missing(error)) throw error
    })
  }
  return true
}
