# AGENTS.md

This is a StartOS service-package repository. It builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

## This repo

- **The `database-grants` oneshot is what makes a restored install reachable.** The SDK's MariaDB restore rebuilds the data directory with only `romm@localhost` and resets root's password to the application password, leaving no account RomM can reach over TCP and no definer for its views and triggers. It runs against the started server on purpose. The same work inside the image's entrypoint races MariaDB's own initialization and upgrade paths.
- **RomM only accepts an account through its API, which is why `admin-account` is a oneshot rather than an init step.** Init cannot reach a server that is not running yet. Letting RomM's own setup wizard run would hand the instance to whoever opens the address first.
- **Rotation uses `PUT /api/users/{id}` with the stored password, not an admin endpoint.** RomM has no way to set a password without authenticating as its owner, so a password changed inside RomM can no longer be rotated from here.
- **`store.json` lives at the root of `main`, which is mounted whole at `/romm`.** RomM can read it. Anything added to that model is readable by the application.
