import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import type { T } from '@start9labs/start-sdk'
import { storeJson } from '../startos/fileModels/store.json.ts'
import { storageState } from '../startos/storageState.ts'

const options = {
  skip:
    process.platform === 'linux'
      ? false
      : 'SDK file writes require Linux flock and /proc',
}

async function fixture(t: TestContext, saved: unknown) {
  const root = await mkdtemp(join(tmpdir(), 'romm-store-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const path = join(root, 'store.json')
  await writeFile(path, JSON.stringify(saved))
  return {
    store: storeJson.withPath(path),
    persisted: async () => JSON.parse(await readFile(path, 'utf8')),
    effects: {} as T.Effects,
  }
}

function existingSettings() {
  return {
    databaseRootPassword: 'database-root-password',
    databasePassword: 'database-password',
    authSecret: 'session-secret',
    adminPassword: 'admin-password',
    primaryUrl: 'https://romm.example',
    extraSettings: { enabled: true, values: ['first', 'second'] },
    libraryStorage: {
      location: 'nextexplorer',
      subpath: 'RomM',
      extraLocationSetting: { retained: true },
    },
    storageMigration: {
      id: '49785d31-734b-46e3-8550-f6b3d8309ab2',
      source: { location: 'nextexplorer', subpath: 'RomM' },
      destination: { location: 'filebrowser', subpath: 'RomM' },
      state: 'failed',
      error: 'Destination is not empty',
      extraJobSetting: { retained: true },
    },
    igdb: {
      selection: 'enabled' as const,
      extraProviderSetting: { retained: true },
      value: {
        clientId: 'igdb-client',
        clientSecret: 'igdb-secret',
        extraCredentialSetting: { retained: true },
      },
    },
    mobygames: {
      selection: 'enabled' as const,
      extraProviderSetting: 'preserved',
      value: { apiKey: 'moby-key', extraCredentialSetting: ['preserved'] },
    },
    steamgriddb: {
      selection: 'disabled' as const,
      extraProviderSetting: { retained: true },
      value: { apiKey: 'retained-disabled-key' },
    },
  }
}

test(
  'updating URL and provider credentials preserves other saved settings',
  options,
  async (t) => {
    const saved = existingSettings()
    const { store, persisted, effects } = await fixture(t, saved)
    await store.merge(effects, {
      primaryUrl: 'https://games.example',
      igdb: { selection: 'enabled', value: { clientSecret: 'rotated-secret' } },
    })
    assert.deepEqual(await persisted(), {
      ...saved,
      primaryUrl: 'https://games.example',
      igdb: {
        ...saved.igdb,
        value: { ...saved.igdb.value, clientSecret: 'rotated-secret' },
      },
    })
  },
)

test(
  'reading and rewriting saved settings preserves provider and storage extensions',
  options,
  async (t) => {
    const saved = existingSettings()
    const { store, persisted, effects } = await fixture(t, saved)
    await store.write(effects, {
      ...(await store.read().once()),
      adminPassword: 'rotated-admin-password',
    })
    assert.deepEqual(await persisted(), {
      ...saved,
      adminPassword: 'rotated-admin-password',
    })
  },
)

test(
  'unrelated setting updates retain invalid storage for explicit recovery',
  options,
  async (t) => {
    const saved = {
      adminPassword: 'admin-password',
      libraryStorage: 'invalid-storage',
      storageMigration: { state: 'unknown' },
    }
    const { store, persisted, effects } = await fixture(t, saved)
    await store.merge(effects, { primaryUrl: 'https://games.example' })
    assert.deepEqual(await persisted(), {
      ...saved,
      primaryUrl: 'https://games.example',
    })
    const read = await store.read().once()
    assert.throws(() => storageState(read), {
      message:
        'Invalid storage settings. Stop RomM and use Recover Internal Library or Cancel Library Copy.',
    })
  },
)
