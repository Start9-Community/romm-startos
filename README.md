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
| `romm`    | Upstream `rommapp/romm` all-in-one, unmodified, pinned by digest             | Upstream's, as PID 1 |
| `mariadb` | `mariadb.Dockerfile` — the official MariaDB image plus five command symlinks | Upstream's, as PID 1 |

Both build for `x86_64` and `aarch64`.

The MariaDB image exists only because `sdk.Backups.withMysqlDump` invokes `mysqld`, `mysqladmin`, `mysqldump`, `mysql` and `mysql_install_db`, which the upstream image no longer installs under those names. Nothing else about the image is changed, and the daemon runs upstream's own entrypoint.

The upstream RomM image is itself a supervisor: behind its single entrypoint it runs the web server, its own Valkey instance, the schema migrator, the filesystem watcher, and the background worker and scheduler. The package does not address those individually.

Two subcontainers run, `romm-app-sub` and `romm-mariadb-sub`. Attach with `start-cli package attach romm -n romm-app-sub`.

## Volume and Data Layout

Two private volumes are always present. Internal storage is the default.

| Volume     | Mount point      | Contents                                                                    |
| ---------- | ---------------- | --------------------------------------------------------------------------- |
| `main`     | `/romm`          | `library/`, `resources/`, `assets/`, `config/`, `redis-data/`, `store.json` |
| `main`     | `/redis-data`    | The same `redis-data/` directory, at the path Valkey writes to              |
| `database` | `/var/lib/mysql` | MariaDB's data directory                                                    |

`main` is mounted at `/romm`. The second mount exposes the same `redis-data/` directory at Valkey's fixed path outside `/romm`.

**Configure Library Storage** copies only `library/` into a dedicated folder in NextExplorer or File Browser, including FileBrowser Quantum. Only `data:<folder>/library` is overlaid at `/romm/library`. Saves, screenshots, artwork, LaunchBox data, configuration, synchronization keys, credentials and Redis remain in RomM's private `main` volume. RomM 5.3.0 falls back to copying when it cannot hardlink across mounts; hardlinks within the library are preserved by the migration.

Shared files are owned by UID/GID 1000 for the file manager. The external mount maps filesystem UID/GID 1000 to RomM's root user, so new RomM uploads stay writable in the file manager. Media files are readable by nginx's worker user. The mapping is restricted to the chosen folder.

Returning to internal storage copies the current library into `main:storage/romm-<uuid>/library`, mounted at `/romm/library`. Previous copies are retained until the user removes them with **Remove Retained Library**. These copies are included in RomM backups until removed. External libraries require the file manager's backup.

## File Models

One model holds StartOS-side state. RomM's private YAML configuration records the library's filesystem structure.

| Model        | File              | Seeded                                    | Rewritten                                                |
| ------------ | ----------------- | ----------------------------------------- | -------------------------------------------------------- |
| `store.json` | `main:store.json` | At install, and by **Set Admin Password** | By configuration actions and automatic initial URL selection |

It holds the two MariaDB passwords and RomM's session-signing secret, generated once on a fresh install and never regenerated — a restore keeps the ones that came with the backup, which is what lets the restored database still be readable. It also holds the admin password and the metadata-provider selections, each written by the action that owns it.

`main:config/config.yml` records the upstream filesystem structure. A fresh library uses `roms/{platform}/{game}` and `bios/{platform}`. Upgrade detects the existing top-level or platform-first folder layout, preserving configured folder names and unrelated settings. An existing explicit structure is retained. Before rewriting an existing configuration, the migration keeps `config.yml.pre-5.3.0` beside it.

RomM 5.3.0 still defaults to the standard top-level layout when no structure is configured. It refuses a platform-first library without a template, or a configuration that still sets `filesystem.roms_folder` or `filesystem.firmware_folder`. The migration handles both cases. Fresh installs also record the standard layout explicitly for clarity.

Database access, provider credentials and the Primary URL are passed as environment variables on every start. `store.json` preserves the provider credentials across restarts.

The selected Primary URL is also stored here. When it is unset, the address watcher saves an available interface URL automatically. After that, **Set Primary URL** owns the choice, including when an address disappears.

The `libraryStorage` selection is absent on existing and fresh installations, preserving the original internal layout. Successful copies record a service and folder. `storageMigration` records a UUID, source, destination, state and failure message. Storage fields remain opaque in the file model and are validated by their consumers: malformed values fail startup explicitly without invalidating credentials or making the recovery action unavailable.

Normal startup reads the store reactively. During a copy, `main` subscribes only to `storageMigration`, so unrelated store writes do not abort it. The copy state is persisted before copying starts. Metadata, URL and password actions reject changes while a copy is pending; automatic URL selection waits until it finishes or is cancelled. Storage changes are queued while stopped and copy before the database or web interface starts.

With the library-only layout, `store.json` is visible to RomM at `/romm/store.json`. Storage copies exclude it, and it is never shared with the file manager.

## Dependencies

NextExplorer (`nextexplorer`) and File Browser (`filebrowser`, including the Quantum flavor) are optional dependencies. The selected shared storage provider and any queued copy's source and destination providers are declared as required to exist. Their servers do not need to be running or publicly reachable for RomM to access the files. Internal storage needs neither service. File Browser requires `>=2.62.2:1 || >=#quantum:1.0.0:0`; NextExplorer requires `>=2.2.7:0`.

Sibling package dependencies use `github:Start9Labs/<package>#next`, with exact commits pinned in `package-lock.json`. `.npmrc` sets `allow-git=all` for npm 12's Git dependency policy. The Quantum flavor shares the `filebrowser` package ID and volume interface; it does not require a second dependency alias.

## Network Access and Interfaces

One HTTP interface. MariaDB is reachable only inside the package's own network namespace and is never exported.

| Interface          | Id   | Type | Port | Purpose                               |
| ------------------ | ---- | ---- | ---- | ------------------------------------- |
| RomM Web Interface | `ui` | `ui` | 8080 | The RomM application and its REST API |

RomM authenticates its own users; the interface adds no authentication of its own.

The package stores a Primary URL chosen from the currently exported interface addresses and passes it to RomM as `ROMM_BASE_URL` for invite and password-reset links. StartOS terminates browser-facing TLS and forwards HTTP internally on port `8080`. If the selected address disappears, StartOS raises an important task while RomM keeps using the saved URL. Once a URL is saved, other address changes do not restart RomM; selecting a different Primary URL does.

## Installation and First-Run Flow

Install generates the database passwords and the session secret, then raises a `critical` task pointing at **Set Admin Password**. RomM will not start until that has been run, so the credential exists and has been shown to the user before the service comes up.

On first start MariaDB initialises its data directory, the `database-grants` oneshot makes sure the `romm` account exists for the hosts RomM connects from, RomM applies its own schema migrations, and then the `admin-account` oneshot creates the administrator inside RomM. The whole sequence takes several minutes on first run and the health checks stay red throughout; that is expected.

**The package pre-empts RomM's own setup wizard.** Upstream shows it to whoever reaches the address first and lets them claim the instance; here the account already exists by the time the interface is reachable, so the wizard never appears.

## Actions

Seven actions.

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

- **When to run it** — to choose which available address RomM uses for invite and password-reset links, or to replace an address that no longer works.
- **What it changes** — stores one currently exported URL in `store.json` and passes it to RomM as `ROMM_BASE_URL`.
- **Cost** — saving a different URL restarts RomM, so the interface is briefly unavailable.
- **Repeat safety** — safe to repeat. Selecting the same URL preserves the saved choice.
- **Outputs** — a confirmation containing the saved URL.

### Configure Library Storage

Run this action while RomM is stopped. Select internal storage, NextExplorer, or File Browser. For a file manager, enter one empty folder name containing only letters, numbers, hyphens and underscores, beginning with a letter or number. The default is `RomM`; it appears as a NextExplorer drive or a File Browser folder.

The action queues a copy and returns immediately. On the next Start, a dedicated `library-storage-copy` oneshot copies the library before starting either MariaDB or RomM. The copy belongs to the service lifecycle, so Stop interrupts it. It is not limited by the action execution timeout. Logs report copied files and bytes every ten seconds, including while an individual file is still copying. Stop takes effect between file copies.

A new copy requires an empty destination. It preserves source files and library hardlinks, rejects symlinks and special files, checks free space and rechecks source files and directories before activation. `fs.copyFile` copies each file. Do not edit files in either application during a copy.

A persisted job UUID owns a hidden staging directory. Restarting after Stop or a reboot retries interrupted work in the same destination, removing only that job's partial staging data. A copy error persists `failed` and its message. Subsequent service starts report the failure without copying again. To retry, stop RomM, fix the reported problem and select the same destination in **Configure Library Storage**; this resets the same job to `pending`.

File contents and metadata, then directories, are flushed before the publication record is written and flushed. A publication record allows an interrupted promotion to finish without recopying or overwriting the completed library. Unexpected files or another job's destination are rejected. Publication flushes the renamed entries before removing the stage, ownership directory and journal. The remaining `.romm-storage` marker carries the job UUID so a restart between publication and saving the active selection can finish without copying again.

After copying succeeds, the package switches the active storage and automatically starts the application. Returning to internal storage creates a new private folder, preserving any older internal copy. Selecting the current location cancels a pending copy and otherwise leaves the library unchanged. Run a scan after reorganizing game folders.

Every completed copy carries a `.romm-storage` marker. Startup checks it before using a selected folder. Keep `.romm-storage` with the folder in backups. Other job files are temporary and are removed after successful publication. Missing storage or an incomplete restore fails startup explicitly.

### Recover Internal Library

This stopped-only action selects the retained original `main:library` and clears pending or malformed storage selections without mounting or requiring the missing file manager. The form and result name `main:library` explicitly: it is the original copy, not the most recent retained internal destination. Recovery excludes later changes in the file manager or other retained copies. If the original was removed, restore a backup first. Selecting **Internal Storage** also uses this fallback when the shared source cannot be read.

### Cancel Library Copy

This separate stopped-only action appears only while a copy is queued, interrupted or failed. It clears the job and retains the original selection and partial output. A cancelled job cannot reclaim its old destination automatically: remove its partial files in the file manager or choose a new empty folder. Inactive internal output can be removed with the cleanup action.

### Remove Retained Library

Run while stopped, after verifying the active library and taking a backup. The action lists inactive managed internal copies, including the original `main:library` and cancelled internal destinations. It refuses active copies, arbitrary paths and all cleanup while a job is pending. Removal is permanent and reduces subsequent backups. Removing the original `main:library` also removes that recovery option. External old folders must be deleted through the file manager. Current private saves, artwork and settings are preserved.

## Tasks

Two tasks cover the administrator password and the Primary URL. Only the password task blocks startup.

| Task                       | Severity    | Raised by                                                                                | Cleared by                                                                                                                |
| -------------------------- | ----------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Run **Set Admin Password** | `critical`  | Init, whenever no password is stored                                                     | Running the action                                                                                                        |
| Run **Set Primary URL**    | `important` | No saved URL and no available interface address, or the saved URL is no longer available | Selecting an available URL, the saved address returning, or an address becoming available for automatic initial selection |

`critical` blocks RomM from starting and suspends the ordinary Start/Stop controls, so a user reporting "there are no buttons" is looking at this. The check runs on every init rather than only at install.

The Primary URL watcher runs on init and reacts to address and selection changes. Its task can return whenever the selected address disappears. It is `important` because RomM can run without a base URL; invite and password-reset links may still use a stale saved address until it is restored or replaced.

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

With internal storage, the backup includes the active ROM library, artwork and retained internal copies. With library-only shared storage, RomM's backup includes its database, saves, screenshots, artwork, credentials, private configuration and selected folder, but not the active ROM library held by the file manager. Retained internal copies increase backup size until explicitly removed.

Complete or cancel any queued storage copy before backing up. For shared storage, keep RomM stopped while backing up both RomM and the selected file manager, and avoid file-manager edits until both backups complete. Restore both matching backups, including the selected folder and its `.romm-storage` marker, before starting RomM. Restoring RomM alone does not restore the current shared library. The administrator password is the one in use when the RomM backup was taken.

## Limitations and Differences

1. **Shared storage copies require an empty destination and enough space for a full copy.** Original files are retained until explicitly cleaned up; symlinks are rejected. Cross-mount hardlinks to private assets become copies.
2. **RomM's bundled Valkey is not reachable or configurable**, and has no health check of its own — a Valkey failure surfaces as RomM misbehaving rather than as a red check.
3. **The database is not reachable from outside the package.** There is no exported interface for it and no action that opens a shell to it.
4. **Saving metadata-provider credentials restarts RomM.** They are delivered as environment variables, which RomM reads only at launch.
5. **Shared libraries need matching backups of RomM and the file manager.** RomM's own backup captures private storage and retained internal copies only.

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
  - IGDB_CLIENT_ID
  - IGDB_CLIENT_SECRET
  - MOBYGAMES_API_KEY
  - STEAMGRIDDB_API_KEY
  - ADMIN_USERNAME
  - ADMIN_EMAIL
  - ADMIN_PASSWORD
dependencies:
  optional: [nextexplorer, filebrowser]
  required: active and queued shared storage providers
interfaces:
  ui: { type: ui, port: 8080 }
actions:
  - set-admin-password
  - configure
  - set-primary-url
  - set-library-storage
  - cleanup-library-storage
  - recover-library-storage
  - cancel-library-copy
tasks:
  - { action: set-admin-password, severity: critical }
  - { action: set-primary-url, severity: important }
health_checks:
  - mariadb
  - romm
```
