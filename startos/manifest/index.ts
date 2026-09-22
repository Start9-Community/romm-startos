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
          'rommapp/romm:5.3.0@sha256:dc586cb3a2c7316fcffb3dc273171b1964523f0f409e989295d26d2199df1d4e',
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
  dependencies: {
    nextexplorer: {
      description: { en_US: 'Optional shared storage for the RomM library.' },
      optional: true,
      metadata: {
        title: 'NextExplorer',
        icon: 'https://raw.githubusercontent.com/Start9Labs/nextexplorer-startos/853598c02f5604fb5f092420e68e7a7e68a50720/icon.svg',
      },
    },
    filebrowser: {
      description: { en_US: 'Optional shared storage for the RomM library.' },
      optional: true,
      metadata: {
        title: 'File Browser',
        icon: 'https://raw.githubusercontent.com/Start9Labs/filebrowser-startos/b4f782cdc3ce629744d7948a240e591795d0dca8/icon.svg',
      },
    },
  },
})
