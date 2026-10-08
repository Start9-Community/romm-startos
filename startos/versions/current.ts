import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.3.1:0',
  releaseNotes: {
    en_US:
      'Updates RomM to 5.3.1 with security and stability fixes, including session revocation after credential changes and fixes for streaming and folder mappings. Full release notes: https://github.com/rommapp/romm/releases/tag/5.3.1',
    es_ES:
      'Actualiza RomM a 5.3.1 con correcciones de seguridad y estabilidad, incluida la revocación de sesiones tras cambiar credenciales y mejoras en la transmisión y las carpetas. Notas completas: https://github.com/rommapp/romm/releases/tag/5.3.1',
    de_DE:
      'Aktualisiert RomM auf 5.3.1 mit Sicherheits- und Stabilitätskorrekturen, einschließlich der Aufhebung von Sitzungen nach einer Änderung der Zugangsdaten sowie Korrekturen für Streaming und Ordnerzuordnungen. Vollständige Versionshinweise: https://github.com/rommapp/romm/releases/tag/5.3.1',
    pl_PL:
      'Aktualizuje RomM do wersji 5.3.1 z poprawkami bezpieczeństwa i stabilności, w tym unieważnianiem sesji po zmianie danych logowania oraz poprawkami transmisji i mapowania folderów. Pełne informacje: https://github.com/rommapp/romm/releases/tag/5.3.1',
    fr_FR:
      'Met RomM à jour vers la version 5.3.1 avec des correctifs de sécurité et de stabilité, notamment la révocation des sessions après un changement des identifiants et des corrections pour le streaming et les dossiers. Notes complètes : https://github.com/rommapp/romm/releases/tag/5.3.1',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
