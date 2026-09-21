import { sdk } from './sdk'
import { i18n } from './i18n'
import { storeJson } from './fileModels/store.json'
import { storageMigrationDaemons } from './storageMigration'
import {
  checkLibraryStorage,
  libraryMounts,
  privateLibraryMounts,
} from './storage'
import {
  adminEmail,
  adminUsername,
  databaseName,
  databasePort,
  databaseUser,
  uiPort,
} from './utils'

// A restored data directory carries the account the SDK's MySQL restore made —
// `romm@localhost` with root's password reset to the application's — so it has
// neither an account RomM can reach over TCP nor a definer for its views.
const grantSql = `
  CREATE USER IF NOT EXISTS '${databaseUser}'@'%' IDENTIFIED BY '$APP_PASSWORD';
  ALTER USER '${databaseUser}'@'%' IDENTIFIED BY '$APP_PASSWORD';
  GRANT ALL PRIVILEGES ON ${databaseName}.* TO '${databaseUser}'@'%';
  CREATE USER IF NOT EXISTS '${databaseUser}'@'127.0.0.1' IDENTIFIED BY '$APP_PASSWORD';
  ALTER USER '${databaseUser}'@'127.0.0.1' IDENTIFIED BY '$APP_PASSWORD';
  GRANT ALL PRIVILEGES ON ${databaseName}.* TO '${databaseUser}'@'127.0.0.1';
`

const grantScript = `
set -eu
for pw in "$ROOT_PASSWORD" "$APP_PASSWORD"; do
  MYSQL_PWD="$pw" mariadb --protocol=socket -u root -e "${grantSql}" && exit 0
done
echo "could not authenticate to MariaDB as root" >&2
exit 1
`

// RomM only accepts an account through its API, so the very first one is
// created against the started server rather than seeded on disk.
const createAdminScript = `
set -eu
API=http://127.0.0.1:${uiPort}/api
i=0
until curl -sf -c /tmp/rj -o /tmp/hb "$API/heartbeat"; do
  i=$((i + 1)); [ "$i" -ge 60 ] && { echo "RomM never answered on $API/heartbeat" >&2; exit 1; }
  sleep 2
done
if ! grep -q '"SHOW_SETUP_WIZARD":true' /tmp/hb; then
  echo "RomM already has an account"
  exit 0
fi
CSRF=$(awk '/romm_csrftoken/ { print $7 }' /tmp/rj)
[ -n "$CSRF" ] || { echo "no CSRF cookie in RomM's heartbeat response" >&2; exit 1; }
cat > /tmp/user.json <<JSON
{"username":"$ADMIN_USERNAME","email":"$ADMIN_EMAIL","password":"$ADMIN_PASSWORD","role":"admin"}
JSON
STATUS=$(curl -s -b /tmp/rj -o /tmp/body -w '%{http_code}' -X POST "$API/users" \
  -H "x-csrftoken: $CSRF" \
  -H 'Content-Type: application/json' \
  -d @/tmp/user.json)
rm -f /tmp/user.json
if [ "$STATUS" != "201" ]; then
  echo "RomM refused the admin account (HTTP $STATUS): $(head -c 400 /tmp/body)" >&2
  exit 1
fi
echo "created the RomM admin account"
`

export const main = sdk.setupMain(async ({ effects }) => {
  const store = await storeJson.read().const(effects)
  if (store?.storageMigration) {
    return storageMigrationDaemons(effects, store.storageMigration)
  }
  const primaryUrl = store?.primaryUrl
  if (
    !store?.databaseRootPassword ||
    !store.databasePassword ||
    !store.authSecret
  ) {
    throw new Error('RomM internal secrets have not been initialized')
  }
  if (!store.adminPassword) {
    throw new Error('The RomM admin password has not been set')
  }

  await checkLibraryStorage(effects, store.libraryStorage)

  const mariadb = sdk.SubContainer.of(
    effects,
    { imageId: 'mariadb' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'database',
      subpath: null,
      mountpoint: '/var/lib/mysql',
      readonly: false,
    }),
    'romm-mariadb-sub',
  )

  const romm = sdk.SubContainer.of(
    effects,
    { imageId: 'romm' },
    libraryMounts(store.libraryStorage),
    'romm-app-sub',
  )

  if (store.libraryStorage) await romm.mount(privateLibraryMounts())

  return sdk.Daemons.of(effects)
    .addDaemon('mariadb', {
      subcontainer: mariadb,
      exec: {
        command: sdk.useEntrypoint(),
        runAsInit: true,
        env: {
          MARIADB_ROOT_PASSWORD: store.databaseRootPassword,
          MARIADB_DATABASE: databaseName,
          MARIADB_USER: databaseUser,
          MARIADB_PASSWORD: store.databasePassword,
        },
      },
      ready: {
        display: i18n('Database'),
        gracePeriod: 120000,
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, databasePort, {
            successMessage: i18n('MariaDB is ready'),
            errorMessage: i18n('MariaDB is not ready'),
          }),
      },
      requires: [],
    })
    .addOneshot('database-grants', {
      subcontainer: mariadb,
      exec: {
        command: ['sh', '-c', grantScript],
        user: 'root',
        env: {
          ROOT_PASSWORD: store.databaseRootPassword,
          APP_PASSWORD: store.databasePassword,
        },
      },
      requires: ['mariadb'],
    })
    .addDaemon('romm', {
      subcontainer: romm,
      exec: {
        command: sdk.useEntrypoint(),
        runAsInit: true,
        env: {
          DB_HOST: '127.0.0.1',
          DB_PORT: String(databasePort),
          DB_NAME: databaseName,
          DB_USER: databaseUser,
          DB_PASSWD: store.databasePassword,
          ROMM_AUTH_SECRET_KEY: store.authSecret,
          ...(store.igdb?.selection === 'enabled' && {
            IGDB_CLIENT_ID: store.igdb.value.clientId,
            IGDB_CLIENT_SECRET: store.igdb.value.clientSecret,
          }),
          ...(store.mobygames?.selection === 'enabled' && {
            MOBYGAMES_API_KEY: store.mobygames.value.apiKey,
          }),
          ...(store.steamgriddb?.selection === 'enabled' && {
            STEAMGRIDDB_API_KEY: store.steamgriddb.value.apiKey,
          }),
          ...(primaryUrl && { ROMM_BASE_URL: primaryUrl }),
        },
      },
      ready: {
        display: i18n('Web Interface'),
        gracePeriod: 180000,
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('RomM is ready'),
            errorMessage: i18n('RomM is not ready'),
          }),
      },
      requires: ['database-grants'],
    })
    .addOneshot('admin-account', {
      subcontainer: romm,
      exec: {
        command: ['sh', '-c', createAdminScript],
        env: {
          ADMIN_USERNAME: adminUsername,
          ADMIN_EMAIL: adminEmail,
          ADMIN_PASSWORD: store.adminPassword,
        },
      },
      requires: ['romm'],
    })
})
