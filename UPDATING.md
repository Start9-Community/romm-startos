# Updating the upstream version

This package runs the official `rommapp/romm` all-in-one image, extended by the root `Dockerfile`, alongside the official `mariadb` image.

## Determining the upstream version

- **RomM** ([rommapp/romm](https://github.com/rommapp/romm)) — fetch the latest release tag:

  ```sh
  gh release view -R rommapp/romm --json tagName -q .tagName
  ```

  The current pin lives in `startos/manifest/index.ts` at `images.romm.source.dockerBuild.buildArgs.IMAGE`, as `rommapp/romm:<version>@sha256:<digest>`; the root `Dockerfile` builds on it.

- **MariaDB** — the `mariadb` image in `startos/manifest/index.ts` is pinned by digest and must stay inside the range RomM's `migrate-mariadb` workflow covers (`.github/workflows/migrations.yml`): its oldest supported LTS leg up to its newest pin. Move it only when RomM raises that floor past it; a major-line change moves the on-disk format and needs its own verification pass.

## Applying the bump

- Resolve the new digest and set both halves of `IMAGE` together — the tag alone is mutable:

  ```sh
  docker buildx imagetools inspect rommapp/romm:<version> --format '{{ .Manifest.Digest }}'
  ```

- Compare upstream's `docker-compose` example against `startos/main.ts`. RomM delivers its whole configuration through environment variables, so a renamed or added variable is the failure mode to look for — nothing on disk records it.
- Confirm the new image index contains native `linux/amd64` and `linux/arm64` manifests.
- Confirm the mount points `/romm` and `/redis-data` are still the paths the image uses, and that RomM still reaches its database over TCP as `romm@127.0.0.1`.
- Confirm `docker/init_scripts/init` still runs `alembic upgrade head` before it starts nginx on port 8080. The `romm` ready check reports a running migration by matching that process with `pgrep`.
