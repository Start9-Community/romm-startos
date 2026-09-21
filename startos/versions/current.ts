import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { migrateConfig } from '../config'

export const current = VersionInfo.of({
  version: '5.3.0:0',
  releaseNotes: {
    en_US:
      'Updates RomM to 5.3.0 and migrates existing library layouts to explicit templates. Full release notes: https://github.com/rommapp/romm/releases/tag/5.3.0',
    es_ES:
      'Actualiza RomM a 5.3.0 y migra las estructuras de biblioteca existentes a plantillas explícitas. Notas completas: https://github.com/rommapp/romm/releases/tag/5.3.0',
    de_DE:
      'Aktualisiert RomM auf 5.3.0 und migriert bestehende Bibliotheksstrukturen auf explizite Vorlagen. Vollständige Versionshinweise: https://github.com/rommapp/romm/releases/tag/5.3.0',
    pl_PL:
      'Aktualizuje RomM do wersji 5.3.0 i migruje istniejące układy biblioteki do jawnych szablonów. Pełne informacje: https://github.com/rommapp/romm/releases/tag/5.3.0',
    fr_FR:
      'Met RomM à jour vers la version 5.3.0 et migre les structures de bibliothèque existantes vers des modèles explicites. Notes complètes : https://github.com/rommapp/romm/releases/tag/5.3.0',
  },
  migrations: {
    up: async ({ effects }) => {
      await migrateConfig(effects)
    },
    down: IMPOSSIBLE,
  },
})
