import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.4.1:1',
  releaseNotes: {
    en_US: `Includes the October 2026 Node.js security fixes.

**Updating from before 5.4.0, the first start can take a while.** RomM migrates its database before it opens, which can take 15–20 minutes on a large library. Its health check says it is applying migrations; don't stop or restart RomM until it is ready.`,
    es_ES: `Incluye las correcciones de seguridad de Node.js de octubre de 2026.

**Si actualizas desde una versión anterior a 5.4.0, el primer arranque puede tardar.** RomM migra su base de datos antes de abrirse, lo que puede llevar entre 15 y 20 minutos con una biblioteca grande. Su comprobación de estado indica que está aplicando migraciones; no detengas ni reinicies RomM hasta que esté listo.`,
    de_DE: `Enthält die Node.js-Sicherheitskorrekturen vom Oktober 2026.

**Beim Update von einer Version vor 5.4.0 kann der erste Start dauern.** RomM migriert seine Datenbank, bevor es öffnet; bei einer großen Bibliothek kann das 15–20 Minuten dauern. Die Zustandsprüfung zeigt an, dass Migrationen laufen; RomM nicht stoppen oder neu starten, bis es bereit ist.`,
    pl_PL: `Zawiera poprawki bezpieczeństwa Node.js z października 2026.

**Przy aktualizacji z wersji starszej niż 5.4.0 pierwsze uruchomienie może potrwać.** RomM migruje swoją bazę danych przed otwarciem, co przy dużej bibliotece może zająć 15–20 minut. Kontrola stanu pokazuje, że trwają migracje; nie zatrzymuj ani nie uruchamiaj ponownie RomM, dopóki nie będzie gotowy.`,
    fr_FR: `Inclut les correctifs de sécurité Node.js d'octobre 2026.

**Depuis une version antérieure à 5.4.0, le premier démarrage peut être long.** RomM migre sa base de données avant de s'ouvrir, ce qui peut prendre 15 à 20 minutes sur une grande bibliothèque. Son contrôle d'état indique que les migrations sont en cours ; n'arrêtez pas et ne redémarrez pas RomM avant qu'il soit prêt.`,
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
