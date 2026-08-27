# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Fix a defect you spot rather than reporting it** — you have the package open and the
context to be sure. File **a GitHub issue on this repo** only when the call isn't yours to
make: you can't pin the cause down, two defensible fixes exist, or it's too large to ride on
the work in hand. An open issue is a report, not a queue — implement one when you're asked
to or when it's labelled `Approved`, then close it with `Closes #<n>`.

Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **`mariadb.Dockerfile` exists for the pre-11 command names** `mysqld`, `mysqladmin`, `mysqldump`, `mysql` and `mysql_install_db`, which are what `sdk.Backups.withMysqlDump` invokes. Dropping the image breaks backup and restore, not the daemon.
- **The `database-grants` oneshot is what makes a restored install reachable.** The SDK's MySQL restore rebuilds the data directory with only `romm@localhost` and resets root's password to the application password, leaving no account RomM can reach over TCP and no definer for its views and triggers. It runs against the started server on purpose — the same work inside the image's entrypoint races MariaDB's own initialization and upgrade paths.
- **RomM only accepts an account through its API, which is why `admin-account` is a oneshot rather than an init step.** Init cannot reach a server that is not running yet, and the alternative — letting RomM's own setup wizard run — hands the instance to whoever opens the address first.
- **Rotation uses `PUT /api/users/{id}` with the stored password, not an admin endpoint.** RomM has no way to set a password without authenticating as its owner, so a password changed inside RomM can no longer be rotated from here.
- **`store.json` lives at the root of `main`, which is mounted whole at `/romm`** — RomM can read it. Anything added to that model is readable by the application.
