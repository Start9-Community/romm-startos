import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'

export const current = VersionInfo.of({
  version: '5.2.0:0',
  releaseNotes: {
    en_US:
      'Updates RomM to 5.2.0 with security fixes, scan and web worker defaults, provider credential migration, and improved invite links through the Primary URL.',
    es_ES:
      'Actualiza RomM a 5.2.0 con correcciones de seguridad, valores de trabajadores de análisis y web, migración de credenciales de proveedores y enlaces de invitación mejorados mediante la URL principal.',
    de_DE:
      'Aktualisiert RomM auf 5.2.0 mit Sicherheitskorrekturen, Vorgaben für Scan- und Web-Worker, Migration der Anbieterzugangsdaten und verbesserten Einladungslinks über die primäre URL.',
    pl_PL:
      'Aktualizuje RomM do 5.2.0, dodając poprawki bezpieczeństwa, ustawienia procesów skanowania i sieci, migrację danych dostawców oraz ulepszone linki zaproszeń przez główny adres URL.',
    fr_FR:
      'Met RomM à jour vers la version 5.2.0 avec des correctifs de sécurité, des valeurs pour les processus d analyse et web, la migration des identifiants fournisseurs et de meilleurs liens d invitation via l URL principale.',
  },
  migrations: {
    up: async ({ effects }) => {
      const store = await storeJson.read().once()

      await storeJson.merge(effects, {
        ...(!store?.igdb &&
          (store?.igdbClientId || store?.igdbClientSecret) && {
            igdb: {
              selection: 'enabled' as const,
              value: {
                clientId: store.igdbClientId ?? '',
                clientSecret: store.igdbClientSecret ?? '',
              },
            },
          }),
        ...(!store?.mobygames &&
          store?.mobygamesApiKey && {
            mobygames: {
              selection: 'enabled' as const,
              value: { apiKey: store.mobygamesApiKey },
            },
          }),
        ...(!store?.steamgriddb &&
          store?.steamGridDbApiKey && {
            steamgriddb: {
              selection: 'enabled' as const,
              value: { apiKey: store.steamGridDbApiKey },
            },
          }),
      })
    },
    down: IMPOSSIBLE,
  },
})
