import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.1.0:11',
  releaseNotes: {
    en_US:
      'Adds Primary URL selection so RomM can generate browser-facing links and redirects through StartOS gateways.',
    es_ES:
      'Añade la selección de URL principal para que RomM genere enlaces y redirecciones para el navegador mediante las pasarelas de StartOS.',
    de_DE:
      'Fügt die Auswahl einer primären URL hinzu, damit RomM Browser-Links und Weiterleitungen über StartOS-Gateways erzeugen kann.',
    pl_PL:
      'Dodaje wybór głównego adresu URL, aby RomM mógł generować odnośniki i przekierowania przez bramy StartOS.',
    fr_FR:
      'Ajoute le choix de l URL principale afin que RomM puisse générer des liens et des redirections via les passerelles StartOS.',
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
