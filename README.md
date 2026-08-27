<p align="center">
  <img src="icon.svg" alt="RomM Logo" width="21%">
</p>

# RomM on StartOS

> Everything not listed in this document should behave the same as upstream
> RomM. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation
> section of `instructions.md` for links.

RomM is a self-hosted manager for a personal game library: it scans a folder of ROMs, matches each one against online games databases for cover art and metadata, and serves the result as a browsable, playable web collection.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Two images run, one of them ours.

| Image     | Source                                                                       | Entrypoint           |
| --------- | ---------------------------------------------------------------------------- | -------------------- |
| `romm`    | `rommapp/romm:5.2.0@sha256:3512f2ca455782f90247271bed23116e6bc675bc74e379be2c41696e607ab11e` | Upstream's, as PID 1 |
| `mariadb` | `mariadb.Dockerfile` — the official MariaDB image plus five command symlinks | Upstream's, as PID 1 |

Both build for `x86_64` and `aarch64`.

The MariaDB image exists only because `sdk.Backups.withMysqlDump` invokes `mysqld`, `mysqladmin`, `mysqldump`, `mysql` and `mysql_install_db`, which MariaDB 11 no longer installs under those names. Nothing else about the image is changed, and the daemon runs upstream's own entrypoint.

The upstream RomM image is itself a supervisor: behind its single entrypoint it runs the web server, its own Valkey instance, the schema migrator, the filesystem watcher, and the background worker and scheduler. The package does not address those individually.

Two subcontainers run, `romm-app-sub` and `romm-mariadb-sub`. Attach with `start-cli package attach romm -n romm-app-sub`.

## Volume and Data Layout

Two volumes, one for the library and one for the database.

| Volume     | Mount point      | Contents                                                                    |
| ---------- | ---------------- | --------------------------------------------------------------------------- |
| `main`     | `/romm`          | `library/`, `resources/`, `assets/`, `config/`, `redis-data/`, `store.json` |
| `main`     | `/redis-data`    | The same `redis-data/` directory, at the path Valkey writes to              |
| `database` | `/var/lib/mysql` | MariaDB's data directory                                                    |

`main` is mounted whole rather than one subdirectory at a time because RomM hardlinks between its library and asset directories, which only works while both sit on one filesystem. The second mount is not a copy — `redis-data/` is one directory reachable at two paths, because Valkey's data path is fixed outside `/romm`.

The library is under `main`, so it is part of every backup. On a large collection that is the dominant cost.

## File Models

One model, holding StartOS-side state rather than upstream configuration.

| Model        | File              | Seeded                                    | Rewritten       |
| ------------ | ----------------- | ----------------------------------------- | --------------- |
| `store.json` | `main:store.json` | At install, and by **Set Admin Password** | By all three actions |

It holds the two MariaDB passwords and RomM's session-signing secret, generated once on a fresh install and never regenerated — a restore keeps the ones that came with the backup, which is what lets the restored database still be readable. It also holds the admin password and the metadata-provider selections, each written by the action that owns it.

RomM itself has no configuration file the package owns. Everything the package asserts is delivered as an environment variable and re-applied on every start, so a value changed inside RomM that also appears in that list does not survive a restart. `store.json` is what makes the provider credentials survive one.

RomM runs with `SCAN_WORKERS=2` and `WEB_SERVER_CONCURRENCY=3`, matching upstream's recommended one-CPU container defaults for scan throughput and API responsiveness.

**`main` reads the store reactively**, so writing it restarts the service. This is how all three actions take effect without asking the user to restart anything.

Because `main` is mounted whole, `store.json` is visible to RomM at `/romm/store.json`.

## Dependencies

None.

## Network Access and Interfaces

One HTTP interface. MariaDB is reachable only inside the package's own network namespace and is never exported.

| Interface          | Id   | Type | Port | Purpose                               |
| ------------------ | ---- | ---- | ---- | ------------------------------------- |
| RomM Web Interface | `ui` | `ui` | 8080 | The RomM application and its REST API |

RomM authenticates its own users; the interface adds no authentication of its own.

The package stores a Primary URL chosen from the currently exported interface addresses and passes it to RomM as `ROMM_BASE_URL`. StartOS terminates browser-facing TLS and forwards HTTP internally on port `8080`. If the selected address disappears, StartOS raises a recoverable task and RomM continues without `ROMM_BASE_URL` until another address is selected.

## Installation and First-Run Flow

Install generates the database passwords and the session secret, then raises a `critical` task pointing at **Set Admin Password**. RomM will not start until that has been run, so the credential exists and has been shown to the user before the service comes up.

On first start MariaDB initialises its data directory, the `database-grants` oneshot makes sure the `romm` account exists for the hosts RomM connects from, RomM applies its own schema migrations, and then the `admin-account` oneshot creates the administrator inside RomM. The whole sequence takes several minutes on first run and the health checks stay red throughout; that is expected.

**The package pre-empts RomM's own setup wizard.** Upstream shows it to whoever reaches the address first and lets them claim the instance; here the account already exists by the time the interface is reachable, so the wizard never appears.

## Actions

Three actions.

### Set Admin Password

- **When to run it** — at install, prompted by the task; afterwards to rotate the password, including after losing it.
- **What it changes** — generates a new random password and writes it to `store.json`. On a rotation it also applies it to the running application.
- **Cost** — writing the store restarts RomM, so the interface is briefly unavailable. Every open session is invalidated.
- **Repeat safety** — safe to repeat, and never a no-op: each run mints a new password and discards the previous one.
- **Outputs** — the username and the new password, shown once.

**Its `allowedStatuses` changes with the package's state, which is deliberate.** Before any password exists it is `only-stopped`, because the first one is applied by the `admin-account` oneshot on the next start. Once one exists it is `only-running`, because a later change goes through RomM's API.

A rotation authenticates as the admin with the password in `store.json` and calls RomM's own user-update endpoint. **If the user changed their password from inside RomM, rotation fails** with a message saying so — the store no longer holds the current password. Recovery is RomM's own profile page, not this action.

### Configure Metadata Providers

- **When to run it** — after the first sign-in, and whenever a provider is added, removed, or its credential rotated. RomM works with none of them; scanning just yields bare filenames.
- **What it changes** — the three provider keys in `store.json`. Nothing else in the file.
- **Cost** — saving restarts RomM, so the interface is briefly unavailable.
- **Repeat safety** — fully idempotent. The form is pre-filled with what is already saved.
- **Outputs** — none.

Each provider is a disabled/enabled union, so its credentials are asked for only when it is turned on, and turning one off is a single choice rather than a set of fields to blank.

### Set Primary URL

- **When to run it**: after enabling the browser-facing interface address, and whenever that address changes.
- **What it changes**: stores one currently exported URL and passes it to RomM as `ROMM_BASE_URL`.
- **Cost**: writing the store restarts RomM so generated links and invite URLs use the new address.
- **Recovery**: if the saved address disappears, StartOS creates an important task while leaving RomM able to start.

## Tasks

One task, raised at install and again whenever no password is stored.

| Task                       | Severity   | Raised by                            | Cleared by         |
| -------------------------- | ---------- | ------------------------------------ | ------------------ |
| Run **Set Admin Password** | `critical` | Init, whenever no password is stored | Running the action |

`critical` blocks RomM from starting and suspends the ordinary Start/Stop controls, so a user reporting "there are no buttons" is looking at this. The check runs on every init rather than only at install.

## Health Checks

Two checks and one oneshot between them.

| Check     | Probes                 | Grace period |
| --------- | ---------------------- | ------------ |
| `mariadb` | Port 3306 is listening | 120s         |
| `romm`    | Port 8080 is listening | 180s         |

`romm` is gated behind the `database-grants` oneshot, which is in turn gated behind `mariadb` — so RomM never starts against a database it cannot log in to. The `admin-account` oneshot runs after `romm` is ready, and is a no-op once RomM reports that it has users.

A `mariadb` check still failing past its grace period means the data directory did not come up: its logs carry the reason, usually a version mismatch after a MariaDB bump or an interrupted initialisation. A `romm` check still failing past its own means either the schema migration is still running — normal after an upstream version bump on a large library — or RomM could not authenticate, in which case the `database-grants` oneshot's output says which password it fell back to.

## Backups and Restore

The strategy is mixed, and the difference matters: `main` is copied wholesale, while `database` is **dumped and replayed** rather than copied. Its files are never captured. Restore rebuilds the data directory from scratch, replays the dump into it, and hands back a database with only the accounts the restore created.

That last point is why `database-grants` exists — the accounts the restore leaves behind are not the ones RomM connects as, nor the ones its views and triggers name as definer. The oneshot repairs both on the first start after a restore, with the passwords carried over in `store.json`.

Nothing is excluded from the backup, so it includes the ROM library. Check the destination has room before running one, and keep an independent copy of anything irreplaceable — the library is the one thing here that cannot be rebuilt.

A restored instance is usable straight away: the accounts, the library, and the artwork all come back, and the administrator password is the one that was in use when the backup was taken.

## Limitations and Differences

1. **The whole `main` volume is one mount, so the library cannot be pointed at separate storage.** Upstream supports mounting `library/` from elsewhere; here it must live with the rest of RomM's data, because RomM hardlinks across those directories.
2. **RomM's bundled Valkey is not reachable or configurable**, and has no health check of its own — a Valkey failure surfaces as RomM misbehaving rather than as a red check.
3. **The database is not reachable from outside the package.** There is no exported interface for it and no action that opens a shell to it.
4. **Saving metadata-provider credentials restarts RomM.** They are delivered as environment variables, which RomM reads only at launch.
5. **Backups include the ROM library and cannot be scoped to exclude it.**

## Quick Reference for AI Consumers

```yaml
package_id: romm
images:
  romm: rommapp/romm
  mariadb: built from mariadb.Dockerfile
architectures: [x86_64, aarch64]
subcontainers: [romm-app-sub, romm-mariadb-sub]
volumes:
  main: /romm, /redis-data
  database: /var/lib/mysql
file_models:
  - store.json
startos_managed_env_vars:
  - MARIADB_ROOT_PASSWORD
  - MARIADB_DATABASE
  - MARIADB_USER
  - MARIADB_PASSWORD
  - DB_HOST
  - DB_PORT
  - DB_NAME
  - DB_USER
  - DB_PASSWD
  - ROMM_AUTH_SECRET_KEY
  - ROMM_BASE_URL
  - SCAN_WORKERS
  - WEB_SERVER_CONCURRENCY
  - IGDB_CLIENT_ID
  - IGDB_CLIENT_SECRET
  - MOBYGAMES_API_KEY
  - STEAMGRIDDB_API_KEY
  - ADMIN_USERNAME
  - ADMIN_EMAIL
  - ADMIN_PASSWORD
dependencies: none
interfaces:
  ui: { type: ui, port: 8080 }
actions:
  - set-admin-password
  - configure
  - set-primary-url
tasks:
  - { action: set-admin-password, severity: critical }
  - { action: set-primary-url, severity: important, conditional: true }
health_checks:
  - mariadb
  - romm
```
