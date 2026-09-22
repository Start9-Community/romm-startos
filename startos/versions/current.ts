import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { migrateConfig } from '../config'

export const current = VersionInfo.of({
  version: '5.3.0:0',
  releaseNotes: {
    en_US:
      'Updates RomM to 5.3.0. Existing libraries keep working without any changes. Full release notes: https://github.com/rommapp/romm/releases/tag/5.3.0',
    es_ES:
      'Actualiza RomM a 5.3.0. Las bibliotecas existentes siguen funcionando sin necesidad de cambios. Notas completas: https://github.com/rommapp/romm/releases/tag/5.3.0',
    de_DE:
      'Aktualisiert RomM auf 5.3.0. Bestehende Bibliotheken funktionieren ohne Änderungen weiter. Vollständige Versionshinweise: https://github.com/rommapp/romm/releases/tag/5.3.0',
    pl_PL:
      'Aktualizuje RomM do wersji 5.3.0. Istniejące biblioteki działają nadal bez potrzeby wprowadzania zmian. Pełne informacje: https://github.com/rommapp/romm/releases/tag/5.3.0',
    fr_FR:
      'Met RomM à jour vers la version 5.3.0. Les bibliothèques existantes continuent de fonctionner sans aucune modification. Notes complètes : https://github.com/rommapp/romm/releases/tag/5.3.0',
  },
  migrations: {
    up: async () => {
      await migrateConfig()
    },
    down: IMPOSSIBLE,
  },
})
