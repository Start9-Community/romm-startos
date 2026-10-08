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
          'rommapp/romm:5.3.1@sha256:0d66b4ea152a237c7f24b95e87459f46d3c596a7c0b35a82f26bc971487278b3',
      },
      arch: ['x86_64', 'aarch64'],
    },
    mariadb: {
      source: {
        dockerTag:
          'mariadb:11.4.5@sha256:49117dcc565cf51aa57ac5fca59ab31213402ff0eae6ffc13c46a37b938f7e4b',
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
