import assert from 'node:assert/strict'
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import type { T } from '@start9labs/start-sdk'
import { sdk } from '../startos/sdk'

function urlField(input: { spec: Record<string, unknown> }) {
  return input.spec.url as {
    values: Record<string, string>
    default: string | null
  }
}

function hostWith(urls: string[]) {
  return {
    bindings: {
      8080: {
        enabled: true,
        options: { preferredExternalPort: 80, addSsl: null, secure: null },
        net: { assignedPort: 80, assignedSslPort: 443 },
        addresses: {
          enabled: [],
          disabled: [],
          guaWan: [],
          lanEnabled: [],
          available: urls.map((url) => {
            const parsed = new URL(url)
            const local = parsed.hostname.endsWith('.local')
            return {
              hostname: parsed.hostname,
              port:
                Number(parsed.port) ||
                (parsed.protocol === 'https:' ? 443 : 80),
              ssl: parsed.protocol === 'https:',
              public: !local,
              metadata: local
                ? { kind: 'mdns', gateways: ['eth0'] }
                : { kind: 'public-domain', gateway: 'eth0' },
            }
          }),
        },
        interfaces: {
          ui: {
            id: 'ui',
            name: 'RomM Web Interface',
            description: '',
            masked: false,
            type: 'ui',
            addressInfo: {
              username: null,
              hostId: 'ui',
              internalPort: 8080,
              scheme: 'http',
              sslScheme: 'https',
              suffix: '',
            },
          },
        },
      },
    },
    bindingRanges: {},
    publicDomains: {},
    privateDomains: {},
    portForwards: [],
  }
}

test('primary URL selection retains saved choices and publishes usable launcher addresses', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'romm-primary-url-'))
  const path = join(root, 'store.json')
  const originalPath = sdk.volumes.main.path
  Object.defineProperty(sdk.volumes.main, 'path', { value: root })
  const tasks = new Map<string, T.CreateTaskParams>()
  const interfaces = new Map<string, T.ExportServiceInterfaceParams>()
  const leave: (() => void | null | undefined)[] = []
  let urls = ['https://romm.local', 'https://games.example']
  const effects = {
    eventId: 'primary-url',
    isInContext: true,
    getHostInfo: async () => hostWith(urls),
    onLeaveContext: (callback: () => void | null | undefined) => {
      leave.push(callback)
    },
    bind: async () => null,
    clearBindings: async () => null,
    clearServiceInterfaces: async () => null,
    exportServiceInterface: async (value: T.ExportServiceInterfaceParams) => {
      interfaces.set(value.id, structuredClone(value))
      return null
    },
    action: {
      createTask: async (value: T.CreateTaskParams) => {
        tasks.set(value.replayId, structuredClone(value))
        return null
      },
      clearTasks: async ({ only }: { only: string[] }) => {
        for (const id of only) tasks.delete(id)
        return null
      },
    },
  } as unknown as T.Effects
  t.after(async () => {
    effects.isInContext = false
    for (const callback of leave) callback()
    Object.defineProperty(sdk.volumes.main, 'path', { value: originalPath })
    await rm(root, { recursive: true, force: true })
  })
  const save = async (value: Record<string, unknown>) => {
    const staging = join(root, 'store.next.json')
    await writeFile(staging, JSON.stringify(value))
    await rename(staging, path)
  }
  const saved = async () => JSON.parse(await readFile(path, 'utf8'))
  await save({ primaryUrl: 'https://romm.local', adminPassword: 'keep-secret' })
  const { primaryUrl, watchPrimaryUrl } =
    await import('../startos/primaryUrl.ts')
  const { setPrimaryUrl } = await import('../startos/actions/setPrimaryUrl.ts')
  const { setInterfaces } = await import('../startos/interfaces.ts')

  await t.test(
    'the existing selection is offered and nominated for Open UI',
    async () => {
      const input = await setPrimaryUrl.getInput({ effects, prefill: null })
      assert.deepEqual(input.value, { url: 'https://romm.local' })
      assert.deepEqual(urlField(input).values, {
        'https://romm.local': 'https://romm.local',
        'https://games.example': 'https://games.example',
      })
      await watchPrimaryUrl.init(effects, null)
      assert.deepEqual([...tasks.values()], [])
      await setInterfaces(effects)
      assert.equal(
        interfaces.get('ui')?.preferredLauncherAddress,
        'https://romm.local',
      )
    },
  )

  await t.test(
    'a changed port is followed without replacing the saved choice',
    async () => {
      urls = ['https://romm.local:8443', 'https://games.example']
      await watchPrimaryUrl.init(effects, null)
      await setInterfaces(effects)
      assert.equal(
        interfaces.get('ui')?.preferredLauncherAddress,
        'https://romm.local:8443',
      )
      assert.equal(
        await primaryUrl.bestUsable(effects).once(),
        'https://romm.local:8443',
      )
      assert.deepEqual([...tasks.values()], [])
      assert.equal((await saved()).primaryUrl, 'https://romm.local')
    },
  )

  await t.test(
    'adding or reordering unrelated addresses leaves the effective selected URL unchanged',
    async () => {
      const observed = [await primaryUrl.bestUsable(effects).once()]
      urls = [
        'https://new.example',
        'https://games.example',
        'https://romm.local:8443',
      ]
      observed.push(await primaryUrl.bestUsable(effects).once())
      urls = ['https://romm.local:8443', 'https://new.example']
      observed.push(await primaryUrl.bestUsable(effects).once())
      assert.deepEqual(observed, [
        'https://romm.local:8443',
        'https://romm.local:8443',
        'https://romm.local:8443',
      ])
      assert.equal((await saved()).primaryUrl, 'https://romm.local')
    },
  )

  await t.test(
    'an unavailable saved selection is retained while a replacement is requested',
    async () => {
      urls = ['https://games.example']
      await watchPrimaryUrl.init(effects, null)
      const task = tasks.get('romm:set-primary-url')
      assert.equal(task?.actionId, 'set-primary-url')
      assert.equal(task?.severity, 'important')
      assert.deepEqual(task?.input, {
        kind: 'partial',
        accept: [],
        set: { url: 'https://games.example' },
      })
      assert.equal((await saved()).primaryUrl, 'https://romm.local')
      assert.deepEqual(
        (await setPrimaryUrl.getInput({ effects, prefill: null })).value,
        { url: 'https://romm.local' },
      )
    },
  )

  await t.test(
    'no available address produces an empty form and retains the saved choice',
    async () => {
      urls = []
      const input = await setPrimaryUrl.getInput({ effects, prefill: null })
      assert.deepEqual(urlField(input).values, {})
      assert.equal(urlField(input).default, null)
      await watchPrimaryUrl.init(effects, null)
      assert.equal(
        tasks.get('romm:set-primary-url')?.actionId,
        'set-primary-url',
      )
      assert.equal((await saved()).primaryUrl, 'https://romm.local')
    },
  )

  await t.test(
    'an unset selection is requested without writing an automatic choice',
    async () => {
      await save({ adminPassword: 'keep-secret' })
      urls = ['https://romm.local', 'https://games.example']
      const input = await setPrimaryUrl.getInput({ effects, prefill: null })
      assert.equal(urlField(input).default, 'https://games.example')
      await watchPrimaryUrl.init(effects, null)
      assert.equal(
        tasks.get('romm:set-primary-url')?.actionId,
        'set-primary-url',
      )
      assert.deepEqual(await saved(), { adminPassword: 'keep-secret' })
    },
  )

  for (const state of ['pending', 'copying', 'failed']) {
    await t.test(
      `a ${state} library copy blocks saves and URL tasks`,
      async () => {
        const value = {
          primaryUrl: 'https://removed.example',
          storageMigration: { state },
        }
        await save(value)
        tasks.clear()
        await watchPrimaryUrl.init(effects, null)
        assert.deepEqual([...tasks.values()], [])
        await setPrimaryUrl.getInput({ effects, prefill: null })
        await assert.rejects(
          setPrimaryUrl.run({
            effects,
            input: { url: 'https://games.example' },
          }),
          {
            message:
              'Finish or cancel the library copy before changing settings.',
          },
        )
        assert.deepEqual(await saved(), value)
      },
    )
  }

  await t.test(
    'an address removed after opening the form cannot be saved',
    async () => {
      const value = { primaryUrl: 'https://romm.local' }
      await save(value)
      await setPrimaryUrl.getInput({ effects, prefill: null })
      urls = ['https://romm.local']
      await assert.rejects(
        setPrimaryUrl.run({ effects, input: { url: 'https://games.example' } }),
        { message: 'Selected RomM URL is no longer available' },
      )
      assert.deepEqual(await saved(), value)
    },
  )

  await t.test(
    'an explicit choice is persisted, clears the task, and becomes the launcher preference',
    {
      skip:
        process.platform === 'linux'
          ? false
          : 'SDK file writes require Linux flock and /proc',
    },
    async () => {
      await save({
        primaryUrl: 'https://removed.example',
        adminPassword: 'keep-secret',
      })
      urls = ['https://romm.local', 'https://games.example']
      await watchPrimaryUrl.init(effects, null)
      await setPrimaryUrl.getInput({ effects, prefill: null })
      await setPrimaryUrl.run({
        effects,
        input: { url: 'https://games.example' },
      })
      assert.deepEqual(await saved(), {
        primaryUrl: 'https://games.example',
        adminPassword: 'keep-secret',
      })
      await watchPrimaryUrl.init(effects, null)
      assert.deepEqual([...tasks.values()], [])
      await setInterfaces(effects)
      assert.equal(
        interfaces.get('ui')?.preferredLauncherAddress,
        'https://games.example',
      )
      assert.equal(
        await primaryUrl.bestUsable(effects).once(),
        'https://games.example',
      )
    },
  )

  await t.test(
    'URL tasks pause during a library copy and react to changes again when it ends',
    async (t) => {
      const contexts = new Map<
        string,
        { effects: T.Effects; close(): void; changed: Set<() => void> }
      >()
      const context = (name: string): T.Effects => {
        contexts.get(name)?.close()
        const cleanup: (() => void | null | undefined)[] = []
        const changed = new Set<() => void>()
        const child = {
          ...effects,
          isInContext: true,
          child: (next: string) => context(`${name}/${next}`),
          onLeaveContext: (callback: () => void | null | undefined) => {
            cleanup.push(callback)
          },
          getHostInfo: async ({ callback }: { callback?: () => void }) => {
            if (callback) changed.add(callback)
            return hostWith(urls)
          },
          setInitProgress: async () => null,
        } as unknown as T.Effects
        contexts.set(name, {
          effects: child,
          changed,
          close: () => {
            child.isInContext = false
            changed.clear()
            for (const callback of cleanup) callback()
          },
        })
        return child
      }
      t.after(() => {
        for (const state of contexts.values()) state.close()
      })
      const taskUrl = () =>
        (
          tasks.get('romm:set-primary-url')?.input?.set as
            | { url?: string }
            | undefined
        )?.url
      const expectTaskUrl = async (expected: string | undefined) => {
        const deadline = Date.now() + 2000
        while (taskUrl() !== expected && Date.now() < deadline)
          await setTimeout(10)
        assert.equal(taskUrl(), expected)
      }
      const value = { primaryUrl: 'https://removed.example' }
      await save(value)
      urls = ['https://games.example']
      tasks.clear()
      await sdk.setupInit(watchPrimaryUrl)({
        effects: context('root'),
        kind: null,
      })
      await expectTaskUrl('https://games.example')
      const copying = { ...value, storageMigration: { state: 'copying' } }
      await save(copying)
      await setTimeout(100)
      urls = ['https://replacement.example']
      for (const state of contexts.values())
        for (const callback of state.changed) callback()
      await setTimeout(100)
      assert.equal(taskUrl(), 'https://games.example')
      assert.deepEqual(await saved(), copying)
      await save(value)
      await expectTaskUrl('https://replacement.example')
      await save({ primaryUrl: 'https://replacement.example' })
      await expectTaskUrl(undefined)
      assert.deepEqual([...tasks.values()], [])
    },
  )
})
