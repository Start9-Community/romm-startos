import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.4.1:2',
  releaseNotes: {
    en_US: `Requires StartOS 0.4.1 or later. FileBrowser library storage now requires FileBrowser Quantum 2.0.2-stable:3 or later; the original File Browser is no longer supported. If you use the original File Browser, switch it in the Marketplace: open File Browser, then under Alternative Implementations choose FileBrowser Quantum and select Switch. Your files and accounts carry over, but back up File Browser first; afterwards, re-apply per-user folder restrictions and access rules, and recreate share links.

**Updating from before 5.4.0, the first start can take a while.** RomM migrates its database before it opens, which can take 15–20 minutes on a large library. Its health check says it is applying migrations; don't stop or restart RomM until it is ready.`,
    es_ES: `Requiere StartOS 0.4.1 o posterior. El almacenamiento de la biblioteca en FileBrowser ahora requiere FileBrowser Quantum 2.0.2-stable:3 o posterior; el File Browser original ya no es compatible. Si usas el File Browser original, cámbialo en el Mercado: abre File Browser y, en Implementaciones alternativas, elige FileBrowser Quantum y selecciona Cambiar. Tus archivos y cuentas se conservan, pero haz antes una copia de seguridad de File Browser; después, vuelve a aplicar las restricciones de carpeta por usuario y las reglas de acceso, y crea de nuevo los enlaces compartidos.

**Si actualizas desde una versión anterior a 5.4.0, el primer arranque puede tardar.** RomM migra su base de datos antes de abrirse, lo que puede llevar entre 15 y 20 minutos con una biblioteca grande. Su comprobación de estado indica que está aplicando migraciones; no detengas ni reinicies RomM hasta que esté listo.`,
    de_DE: `Erfordert StartOS 0.4.1 oder neuer. Der FileBrowser-Bibliotheksspeicher erfordert jetzt FileBrowser Quantum 2.0.2-stable:3 oder neuer; der ursprüngliche File Browser wird nicht mehr unterstützt. Wenn Sie den ursprünglichen File Browser verwenden, wechseln Sie im Marktplatz: Öffnen Sie File Browser, wählen Sie unter Alternative Implementierungen FileBrowser Quantum und anschließend Wechseln. Ihre Dateien und Konten bleiben erhalten, aber sichern Sie File Browser vorher; richten Sie danach benutzerbezogene Ordnerbeschränkungen und Zugriffsregeln erneut ein und erstellen Sie Freigabelinks neu.

**Beim Update von einer Version vor 5.4.0 kann der erste Start dauern.** RomM migriert seine Datenbank, bevor es öffnet; bei einer großen Bibliothek kann das 15–20 Minuten dauern. Die Zustandsprüfung zeigt an, dass Migrationen laufen; RomM nicht stoppen oder neu starten, bis es bereit ist.`,
    pl_PL: `Wymaga StartOS 0.4.1 lub nowszego. Przechowywanie biblioteki w FileBrowser wymaga teraz FileBrowser Quantum 2.0.2-stable:3 lub nowszego; oryginalny File Browser nie jest już obsługiwany. Jeśli używasz oryginalnego File Browser, przełącz go w Sklepie: otwórz File Browser, w sekcji Alternatywne implementacje wybierz FileBrowser Quantum i kliknij Przełącz. Twoje pliki i konta zostaną zachowane, ale najpierw wykonaj kopię zapasową File Browser; potem ponownie ustaw ograniczenia folderów przypisane do użytkowników i reguły dostępu oraz utwórz nowe linki udostępniania.

**Przy aktualizacji z wersji starszej niż 5.4.0 pierwsze uruchomienie może potrwać.** RomM migruje swoją bazę danych przed otwarciem, co przy dużej bibliotece może zająć 15–20 minut. Kontrola stanu pokazuje, że trwają migracje; nie zatrzymuj ani nie uruchamiaj ponownie RomM, dopóki nie będzie gotowy.`,
    fr_FR: `Nécessite StartOS 0.4.1 ou une version ultérieure. Le stockage de la bibliothèque dans FileBrowser nécessite désormais FileBrowser Quantum 2.0.2-stable:3 ou une version ultérieure ; le File Browser d'origine n'est plus pris en charge. Si vous utilisez le File Browser d'origine, changez-le dans la Bibliothèque de services : ouvrez File Browser, puis sous Implémentations alternatives choisissez FileBrowser Quantum et sélectionnez Changer. Vos fichiers et comptes sont conservés, mais sauvegardez d'abord File Browser ; ensuite, réappliquez les restrictions de dossier par utilisateur et les règles d'accès, puis recréez les liens de partage.

**Depuis une version antérieure à 5.4.0, le premier démarrage peut être long.** RomM migre sa base de données avant de s'ouvrir, ce qui peut prendre 15 à 20 minutes sur une grande bibliothèque. Son contrôle d'état indique que les migrations sont en cours ; n'arrêtez pas et ne redémarrez pas RomM avant qu'il soit prêt.`,
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
