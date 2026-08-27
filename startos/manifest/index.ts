import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'romm',
  title: 'RomM',
  license: 'AGPL-3.0',
  packageRepo: 'https://github.com/Start9-Community/romm-startos',
  upstreamRepo: 'https://github.com/rommapp/romm',
  marketingUrl: 'https://romm.app/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'database'],
  images: {
    romm: {
      source: {
        dockerTag:
          'rommapp/romm:5.1.0@sha256:ce9d86ab531e09fede45d00f426e3bf2d1f5dd14846f94d6360d77a92a413028',
      },
      arch: ['x86_64', 'aarch64'],
    },
    mariadb: {
      source: {
        dockerBuild: { dockerfile: './mariadb.Dockerfile' },
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})
