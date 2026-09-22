import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { migrateConfig } from '../config'

export const current = VersionInfo.of({
  version: '5.3.0:0',
  releaseNotes: {
    en_US:
      'Updates RomM to 5.3.0 and adds optional shared ROM storage with recovery, restartable copies and cleanup. Saves and artwork stay private. Existing libraries keep working without any changes. Full release notes: https://github.com/rommapp/romm/releases/tag/5.3.0',
    es_ES:
      'Actualiza RomM a 5.3.0 y añade almacenamiento compartido opcional para ROMs, con recuperación, copias reiniciables y limpieza. Las partidas y las imágenes siguen siendo privadas. Las bibliotecas existentes siguen funcionando sin necesidad de cambios. Notas completas: https://github.com/rommapp/romm/releases/tag/5.3.0',
    de_DE:
      'Aktualisiert RomM auf 5.3.0 und bietet optionalen gemeinsamen ROM-Speicher mit Wiederherstellung, neu startbaren Kopien und Bereinigung. Spielstände und Bilder bleiben privat. Bestehende Bibliotheken funktionieren ohne Änderungen weiter. Vollständige Versionshinweise: https://github.com/rommapp/romm/releases/tag/5.3.0',
    pl_PL:
      'Aktualizuje RomM do wersji 5.3.0 i dodaje opcjonalny współdzielony magazyn ROM-ów z odzyskiwaniem, ponawianiem kopii i usuwaniem starych kopii. Zapisy gier i grafiki pozostają prywatne. Istniejące biblioteki działają nadal bez potrzeby wprowadzania zmian. Pełne informacje: https://github.com/rommapp/romm/releases/tag/5.3.0',
    fr_FR:
      'Met RomM à jour vers la version 5.3.0 et ajoute un stockage partagé optionnel des ROMs avec récupération, copies redémarrables et nettoyage. Les sauvegardes de jeux et les illustrations restent privées. Les bibliothèques existantes continuent de fonctionner sans aucune modification. Notes complètes : https://github.com/rommapp/romm/releases/tag/5.3.0',
  },
  migrations: {
    up: async () => {
      await migrateConfig()
    },
    down: IMPOSSIBLE,
  },
})
