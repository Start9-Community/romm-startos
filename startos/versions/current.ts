import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.3.1:1',
  releaseNotes: {
    en_US:
      'Migrates the package to StartOS SDK 3.0.2, requiring StartOS 0.4.0.2 or later. Updates storage dependency declarations and MariaDB backups while preserving stored settings. RomM remains at 5.3.1.',
    es_ES:
      'Migra el paquete al SDK de StartOS 3.0.2 y requiere StartOS 0.4.0.2 o posterior. Actualiza las dependencias de almacenamiento y las copias de seguridad de MariaDB, conservando la configuración guardada. RomM sigue en la versión 5.3.1.',
    de_DE:
      'Stellt das Paket auf StartOS SDK 3.0.2 um und benötigt StartOS 0.4.0.2 oder neuer. Aktualisiert Speicherabhängigkeiten und MariaDB-Sicherungen und erhält gespeicherte Einstellungen. RomM bleibt auf Version 5.3.1.',
    pl_PL:
      'Przenosi pakiet na StartOS SDK 3.0.2 i wymaga StartOS 0.4.0.2 lub nowszego. Aktualizuje zależności pamięci masowej i kopie zapasowe MariaDB, zachowując zapisane ustawienia. RomM pozostaje w wersji 5.3.1.',
    fr_FR:
      'Migre le paquet vers le SDK StartOS 3.0.2 et nécessite StartOS 0.4.0.2 ou une version ultérieure. Met à jour les dépendances de stockage et les sauvegardes MariaDB en conservant les paramètres enregistrés. RomM reste en version 5.3.1.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
