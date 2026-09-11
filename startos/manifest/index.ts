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
          'rommapp/romm:5.2.0@sha256:3512f2ca455782f90247271bed23116e6bc675bc74e379be2c41696e607ab11e',
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
