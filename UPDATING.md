# Updating the upstream version

This package runs the official `rommapp/romm` all-in-one image unmodified, alongside a MariaDB image built from `mariadb.Dockerfile`.

## Determining the upstream version

- **RomM** ([rommapp/romm](https://github.com/rommapp/romm)) — fetch the latest release tag:

  ```sh
  gh release view -R rommapp/romm --json tagName -q .tagName
  ```

  The current pin lives in `startos/manifest/index.ts` at `images.romm.source.dockerTag`, as `rommapp/romm:<version>@sha256:<digest>`.

- **MariaDB** — the base image in `mariadb.Dockerfile` is pinned by digest and tracks the release line RomM tests against. Bump it only when RomM does; a major-line change moves the on-disk format and needs its own verification pass.

## Applying the bump

- Resolve the new digest and set both halves of `dockerTag` together — the tag alone is mutable:

  ```sh
  docker buildx imagetools inspect rommapp/romm:<version> --format '{{ .Manifest.Digest }}'
  ```

- Compare upstream's `docker-compose` example against `startos/main.ts`. RomM delivers its whole configuration through environment variables, so a renamed or added variable is the failure mode to look for — nothing on disk records it.
- Confirm the mount points `/romm` and `/redis-data` are still the paths the image uses, and that RomM still reaches its database over TCP as `romm@127.0.0.1`.
- Install over an existing install and watch the first start: RomM applies its own schema migrations at boot, and their output is in the `romm` daemon's logs.
