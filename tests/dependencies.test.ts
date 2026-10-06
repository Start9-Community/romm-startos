import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import type { T } from '@start9labs/start-sdk'
import { sdk } from '../startos/sdk'

test(
  'publishes storage requirements and updates them when configured storage changes',
  { timeout: 15000 },
  async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'romm-dependencies-'))
    const originalPath = sdk.volumes.main.path
    Object.defineProperty(sdk.volumes.main, 'path', { value: root })
    const contexts: T.Effects[] = []
    const leaveCallbacks: (() => void | null | undefined)[] = []
    let published: T.DependencyRequirement[] = []
    const hostContext = (): T.Effects => {
      const context = {
        eventId: 'storage-dependencies',
        isInContext: true,
        child: hostContext,
        onLeaveContext: (callback: () => void | null | undefined) => {
          leaveCallbacks.push(callback)
        },
        setDependencies: async ({
          dependencies,
        }: {
          dependencies: T.DependencyRequirement[]
        }) => {
          published = structuredClone(dependencies)
          return null
        },
      } as unknown as T.Effects
      contexts.push(context)
      return context
    }
    t.after(async () => {
      for (const context of contexts) context.isInContext = false
      for (const callback of leaveCallbacks) callback()
      Object.defineProperty(sdk.volumes.main, 'path', { value: originalPath })
      await rm(root, { recursive: true, force: true })
    })
    const save = async (store: Record<string, unknown>) => {
      const staging = join(root, 'store.next.json')
      await writeFile(staging, JSON.stringify(store))
      await rename(staging, join(root, 'store.json'))
    }
    await save({})
    const { dependencies } = await import('../startos/dependencies.ts')
    const { manifest } = await import('../startos/index.ts')

    await t.test(
      'the package publishes optional storage metadata and supported versions',
      () => {
        assert.deepEqual(manifest.dependencies, {
          nextexplorer: {
            description: {
              en_US: 'Optional shared storage for the RomM library.',
            },
            optional: true,
            versionRange: '>=2.2.7:0',
            kind: 'exists',
            metadata: {
              title: { en_US: 'NextExplorer' },
              icon: 'https://raw.githubusercontent.com/Start9Labs/nextexplorer-startos/853598c02f5604fb5f092420e68e7a7e68a50720/icon.svg',
            },
          },
          filebrowser: {
            description: {
              en_US: 'Optional shared storage for the RomM library.',
            },
            optional: true,
            versionRange: '>=2.62.2:1 || >=#quantum:1.0.0:0',
            kind: 'exists',
            metadata: {
              title: { en_US: 'File Browser' },
              icon: 'https://raw.githubusercontent.com/Start9Labs/filebrowser-startos/b4f782cdc3ce629744d7948a240e591795d0dca8/icon.svg',
            },
          },
        })
      },
    )

    const nextExplorer = { location: 'nextexplorer', subpath: 'RomM' }
    const fileBrowser = { location: 'filebrowser', subpath: 'RomM' }
    const internal = { location: 'internal', subpath: 'RomM' }
    const nextRequirement: T.DependencyRequirement = {
      id: 'nextexplorer',
      kind: 'exists',
      versionRange: '>=2.2.7:0',
    }
    const fileRequirement: T.DependencyRequirement = {
      id: 'filebrowser',
      kind: 'exists',
      versionRange: '>=2.62.2:1 || >=#quantum:1.0.0:0',
    }
    const expectRequirements = async (expected: T.DependencyRequirement[]) => {
      const deadline = Date.now() + 3000
      while (
        JSON.stringify(published) !== JSON.stringify(expected) &&
        Date.now() < deadline
      )
        await setTimeout(10)
      assert.deepEqual(published, expected)
    }
    await dependencies.init(hostContext())
    await expectRequirements([])

    await t.test(
      'an active provider is required without requiring it to run',
      async () => {
        await save({ libraryStorage: nextExplorer })
        await expectRequirements([nextRequirement])
        await save({ libraryStorage: fileBrowser })
        await expectRequirements([fileRequirement])
      },
    )

    for (const state of ['pending', 'copying', 'failed']) {
      await t.test(
        `a ${state} copy retains both source and destination providers`,
        async () => {
          await save({ libraryStorage: internal })
          await expectRequirements([])
          await save({
            libraryStorage: internal,
            storageMigration: {
              id: randomUUID(),
              source: nextExplorer,
              destination: fileBrowser,
              state,
            },
          })
          await expectRequirements([nextRequirement, fileRequirement])
        },
      )
    }

    await t.test(
      'the active provider remains required when it differs from the copy destination',
      async () => {
        await save({ libraryStorage: internal })
        await expectRequirements([])
        await save({
          libraryStorage: nextExplorer,
          storageMigration: {
            id: randomUUID(),
            destination: fileBrowser,
            state: 'pending',
          },
        })
        await expectRequirements([nextRequirement, fileRequirement])
        await save({ libraryStorage: fileBrowser })
        await expectRequirements([fileRequirement])
      },
    )

    await t.test(
      'internal storage and an unset selection release all providers',
      async () => {
        await save({ libraryStorage: internal })
        await expectRequirements([])
        await save({ libraryStorage: fileBrowser })
        await expectRequirements([fileRequirement])
        await save({})
        await expectRequirements([])
      },
    )
  },
)
