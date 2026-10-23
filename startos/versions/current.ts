import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.4.1:0',
  releaseNotes: {
    en_US: `Updates RomM to 5.4.1.

**The first start after updating can take a while.** RomM migrates its database before it opens, which can take 15–20 minutes on a large library. Its health check says it is applying migrations; don't stop or restart RomM until it is ready.

- New: a notification inbox, RetroArch Cloud Sync, save sync for the in-browser players, sending games to your devices, parental controls and an audit log
- New: **Configure Email** lets RomM send password-reset links and notifications through your server's SMTP settings or your own SMTP server
- Security: updates Pillow, Node.js and the certificate bundle
- Browser-based clients on another site can no longer call RomM's API

[Full release notes](https://github.com/rommapp/romm/releases/tag/5.4.0) · [5.4.1](https://github.com/rommapp/romm/releases/tag/5.4.1)`,
    es_ES: `Actualiza RomM a 5.4.1.

**El primer arranque tras la actualización puede tardar.** RomM migra su base de datos antes de abrirse, lo que puede llevar entre 15 y 20 minutos con una biblioteca grande. Su comprobación de estado indica que está aplicando migraciones; no detengas ni reinicies RomM hasta que esté listo.

- Novedad: bandeja de notificaciones, RetroArch Cloud Sync, sincronización de partidas en los reproductores del navegador, envío de juegos a tus dispositivos, control parental y registro de auditoría
- Novedad: **Configurar correo electrónico** permite que RomM envíe enlaces para restablecer la contraseña y notificaciones con la configuración SMTP de tu servidor o con tu propio servidor SMTP
- Seguridad: actualiza Pillow, Node.js y el paquete de certificados
- Los clientes de navegador alojados en otro sitio ya no pueden llamar a la API de RomM

[Notas completas](https://github.com/rommapp/romm/releases/tag/5.4.0) · [5.4.1](https://github.com/rommapp/romm/releases/tag/5.4.1)`,
    de_DE: `Aktualisiert RomM auf 5.4.1.

**Der erste Start nach dem Update kann dauern.** RomM migriert seine Datenbank, bevor es öffnet; bei einer großen Bibliothek kann das 15–20 Minuten dauern. Die Zustandsprüfung zeigt an, dass Migrationen laufen; RomM nicht stoppen oder neu starten, bis es bereit ist.

- Neu: Benachrichtigungseingang, RetroArch Cloud Sync, Spielstand-Synchronisierung für die Browser-Player, Spiele an deine Geräte senden, Jugendschutz und ein Audit-Log
- Neu: **E-Mail konfigurieren** lässt RomM Links zum Zurücksetzen des Passworts und Benachrichtigungen über die SMTP-Einstellungen deines Servers oder einen eigenen SMTP-Server versenden
- Sicherheit: aktualisiert Pillow, Node.js und das Zertifikatsbündel
- Browserbasierte Clients auf einer anderen Website können RomMs API nicht mehr aufrufen

[Vollständige Versionshinweise](https://github.com/rommapp/romm/releases/tag/5.4.0) · [5.4.1](https://github.com/rommapp/romm/releases/tag/5.4.1)`,
    pl_PL: `Aktualizuje RomM do wersji 5.4.1.

**Pierwsze uruchomienie po aktualizacji może potrwać.** RomM migruje swoją bazę danych przed otwarciem, co przy dużej bibliotece może zająć 15–20 minut. Kontrola stanu pokazuje, że trwają migracje; nie zatrzymuj ani nie uruchamiaj ponownie RomM, dopóki nie będzie gotowy.

- Nowość: skrzynka powiadomień, RetroArch Cloud Sync, synchronizacja zapisów w odtwarzaczach przeglądarkowych, wysyłanie gier na twoje urządzenia, kontrola rodzicielska i dziennik audytu
- Nowość: **Skonfiguruj e-mail** pozwala RomM wysyłać linki do resetowania hasła i powiadomienia przez ustawienia SMTP twojego serwera lub własny serwer SMTP
- Bezpieczeństwo: aktualizuje Pillow, Node.js i pakiet certyfikatów
- Klienci przeglądarkowi z innej witryny nie mogą już wywoływać API RomM

[Pełne informacje](https://github.com/rommapp/romm/releases/tag/5.4.0) · [5.4.1](https://github.com/rommapp/romm/releases/tag/5.4.1)`,
    fr_FR: `Met RomM à jour vers la version 5.4.1.

**Le premier démarrage après la mise à jour peut être long.** RomM migre sa base de données avant de s'ouvrir, ce qui peut prendre 15 à 20 minutes sur une grande bibliothèque. Son contrôle d'état indique que les migrations sont en cours ; n'arrêtez pas et ne redémarrez pas RomM avant qu'il soit prêt.

- Nouveau : boîte de notifications, RetroArch Cloud Sync, synchronisation des sauvegardes pour les lecteurs du navigateur, envoi de jeux vers vos appareils, contrôle parental et journal d'audit
- Nouveau : **Configurer l'e-mail** permet à RomM d'envoyer des liens de réinitialisation du mot de passe et des notifications via les paramètres SMTP de votre serveur ou votre propre serveur SMTP
- Sécurité : met à jour Pillow, Node.js et le paquet de certificats
- Les clients web hébergés sur un autre site ne peuvent plus appeler l'API de RomM

[Notes complètes](https://github.com/rommapp/romm/releases/tag/5.4.0) · [5.4.1](https://github.com/rommapp/romm/releases/tag/5.4.1)`,
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
