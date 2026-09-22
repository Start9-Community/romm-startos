import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'

export const v5_2_0_0 = VersionInfo.of({
  version: '5.2.0:0',
  releaseNotes: {
    en_US:
      'Updates RomM to 5.2.0, which includes security fixes. Adds a Set Primary URL action so invite and password-reset links use the address you choose. Full release notes: https://github.com/rommapp/romm/releases/tag/5.2.0',
    es_ES:
      'Actualiza RomM a 5.2.0, que incluye correcciones de seguridad. Añade la acción Establecer URL principal para que los enlaces de invitación y restablecimiento de contraseña usen la dirección que elijas. Notas completas de la versión: https://github.com/rommapp/romm/releases/tag/5.2.0',
    de_DE:
      'Aktualisiert RomM auf 5.2.0 mit Sicherheitskorrekturen. Fügt die Aktion Primäre URL festlegen hinzu, damit Einladungslinks und Links zum Zurücksetzen des Passworts die gewählte Adresse verwenden. Vollständige Versionshinweise: https://github.com/rommapp/romm/releases/tag/5.2.0',
    pl_PL:
      'Aktualizuje RomM do wersji 5.2.0 zawierającej poprawki bezpieczeństwa. Dodaje akcję Ustaw główny adres URL, aby linki zaproszeń i resetowania hasła używały wybranego adresu. Pełne informacje o wydaniu: https://github.com/rommapp/romm/releases/tag/5.2.0',
    fr_FR:
      "Met RomM à jour vers la version 5.2.0, qui inclut des correctifs de sécurité. Ajoute l'action Définir l'URL principale pour que les liens d'invitation et de réinitialisation du mot de passe utilisent l'adresse choisie. Notes de version complètes : https://github.com/rommapp/romm/releases/tag/5.2.0",
  },
  migrations: {
    up: async ({ effects }) => {
      const {
        igdbClientId,
        igdbClientSecret,
        mobygamesApiKey,
        steamGridDbApiKey,
        ...store
      } = (await storeJson.read().once()) ?? {}
      const clientId = typeof igdbClientId === 'string' ? igdbClientId : ''
      const clientSecret =
        typeof igdbClientSecret === 'string' ? igdbClientSecret : ''

      await storeJson.write(effects, {
        ...store,
        ...(!store.igdb &&
          (clientId || clientSecret) && {
            igdb: {
              selection: 'enabled' as const,
              value: { clientId, clientSecret },
            },
          }),
        ...(!store.mobygames &&
          typeof mobygamesApiKey === 'string' &&
          mobygamesApiKey && {
            mobygames: {
              selection: 'enabled' as const,
              value: { apiKey: mobygamesApiKey },
            },
          }),
        ...(!store.steamgriddb &&
          typeof steamGridDbApiKey === 'string' &&
          steamGridDbApiKey && {
            steamgriddb: {
              selection: 'enabled' as const,
              value: { apiKey: steamGridDbApiKey },
            },
          }),
      })
    },
    down: IMPOSSIBLE,
  },
})
