import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.3.1:0',
  releaseNotes: {
    en_US:
      'Updates RomM to 5.3.1 with security and stability fixes, including session revocation after credential changes and fixes for streaming and folder mappings. Full release notes: https://github.com/rommapp/romm/releases/tag/5.3.1\n\n- Requires StartOS 0.4.0.2 or later.\n- RomM follows port and HTTPS changes for the selected hostname. Open UI prefers that address when your connection can reach it.\n- Keeps additional provider and library settings when saving configuration.\n- Compresses database backups.',
    es_ES:
      'Actualiza RomM a 5.3.1 con correcciones de seguridad y estabilidad, incluida la revocación de sesiones tras cambiar credenciales y mejoras en la transmisión y las carpetas. Notas completas: https://github.com/rommapp/romm/releases/tag/5.3.1\n\n- Requiere StartOS 0.4.0.2 o posterior.\n- RomM sigue los cambios de puerto y HTTPS del nombre de host elegido. Abrir interfaz prefiere esa dirección cuando tu conexión puede acceder a ella.\n- Conserva los ajustes adicionales de proveedores y biblioteca al guardar la configuración.\n- Comprime las copias de seguridad de la base de datos.',
    de_DE:
      'Aktualisiert RomM auf 5.3.1 mit Sicherheits- und Stabilitätskorrekturen, einschließlich der Aufhebung von Sitzungen nach einer Änderung der Zugangsdaten sowie Korrekturen für Streaming und Ordnerzuordnungen. Vollständige Versionshinweise: https://github.com/rommapp/romm/releases/tag/5.3.1\n\n- Benötigt StartOS 0.4.0.2 oder neuer.\n- RomM berücksichtigt Änderungen am Port und an HTTPS für den gewählten Hostnamen. Oberfläche öffnen bevorzugt diese Adresse, wenn sie über deine Verbindung erreichbar ist.\n- Behält zusätzliche Anbieter- und Bibliothekseinstellungen beim Speichern der Konfiguration bei.\n- Komprimiert Datenbanksicherungen.',
    pl_PL:
      'Aktualizuje RomM do wersji 5.3.1 z poprawkami bezpieczeństwa i stabilności, w tym unieważnianiem sesji po zmianie danych logowania oraz poprawkami transmisji i mapowania folderów. Pełne informacje: https://github.com/rommapp/romm/releases/tag/5.3.1\n\n- Wymaga StartOS 0.4.0.2 lub nowszego.\n- RomM uwzględnia zmiany portu i HTTPS wybranej nazwy hosta. Otwórz interfejs preferuje ten adres, jeśli jest dostępny przez Twoje połączenie.\n- Zachowuje dodatkowe ustawienia dostawców i biblioteki podczas zapisywania konfiguracji.\n- Kompresuje kopie zapasowe bazy danych.',
    fr_FR:
      'Met RomM à jour vers la version 5.3.1 avec des correctifs de sécurité et de stabilité, notamment la révocation des sessions après un changement des identifiants et des corrections pour le streaming et les dossiers. Notes complètes : https://github.com/rommapp/romm/releases/tag/5.3.1\n\n- Nécessite StartOS 0.4.0.2 ou une version ultérieure.\n- RomM suit les changements de port et de HTTPS du nom d’hôte choisi. Ouvrir l’interface privilégie cette adresse lorsque votre connexion permet de la joindre.\n- Conserve les paramètres supplémentaires des fournisseurs et de la bibliothèque lors de la sauvegarde de la configuration.\n- Compresse les sauvegardes de la base de données.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
