# Updating the upstream version

This package runs the official `rommapp/romm` all-in-one image unmodified, alongside the official `mariadb` image.

## Validating the package

Use [start-cli 2.3.0](https://github.com/Start9Labs/start-technologies/releases/tag/start-cli/v2.3.0) or later to build and inspect this package. Older CLIs can drop SDK 3 manifest fields or pack prebuilt images for the wrong CPU architecture. The Makefile rejects those versions. Verify the architecture of the executables inside each packaged image as well as the manifest.

Run `npm ci`, `npm run test:types`, and `make x86 arm`. The SDK supplies the compiler, formatter, linter and bundler. The Makefile checks package TypeScript and runs `npm test` before bundling. Changes to the Makefile or behavioral tests trigger a new bundle. Use `make format` to format package sources.

The persisted file-model tests require Linux because SDK 3 uses Linux filesystem locking. Run the full test suite on Linux in addition to any host checks. Run `npm run test:runtime` with Docker to verify account login, the RomM upgrade and shared library storage. Native StartOS install, upgrade and backup/restore checks remain separate acceptance steps.

When changing storage providers, verify their package IDs and `data` volume against the local contract in `startos/storage.ts` and their supported ranges in `startos/dependencies.ts`.

## Determining the upstream version

- **RomM** ([rommapp/romm](https://github.com/rommapp/romm)) — fetch the latest release tag:

  ```sh
  gh release view -R rommapp/romm --json tagName -q .tagName
  ```

  The current pin lives in `startos/manifest/index.ts` at `images.romm.source.dockerTag`, as `rommapp/romm:<version>@sha256:<digest>`.

- **MariaDB** — the `mariadb` image in `startos/manifest/index.ts` is pinned by digest and tracks the release line RomM tests against. Bump it only when RomM does; a major-line change moves the on-disk format and needs its own verification pass.

## Applying the bump

- Resolve the new digest and set both halves of `dockerTag` together — the tag alone is mutable:

  ```sh
  docker buildx imagetools inspect rommapp/romm:<version> --format '{{ .Manifest.Digest }}'
  ```

- Compare upstream's `docker-compose` example against `startos/main.ts`. RomM delivers its whole configuration through environment variables, so a renamed or added variable is the failure mode to look for — nothing on disk records it.
- Verify the selected `ROMM_BASE_URL` appears in generated invite and password-reset links.
- Confirm the new image index contains native `linux/amd64` and `linux/arm64` manifests.
- Confirm the mount points `/romm` and `/redis-data` are still the paths the image uses, and that RomM still reaches its database over TCP as `romm@127.0.0.1`.
- Install over an existing install and watch the first start: RomM applies its own schema migrations at boot, and their output is in the `romm` daemon's logs.
