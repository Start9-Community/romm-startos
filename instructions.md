# RomM

StartOS creates RomM's administrator account for you. Run **Set Admin Password** before you start RomM — the password it gives you is shown once.

## Documentation

- [RomM documentation](https://docs.romm.app) — the upstream guide, including the folder layout for your library and the list of supported platforms.

## What you get on StartOS

A web library for your game collection. Drop ROM files into a folder per console, run a scan, and RomM matches each file against online games databases to fill in cover art, release dates, descriptions, and box scans — then lets you browse, search, and play the supported ones in the browser.

RomM comes with its own database and cache; nothing else needs installing. With internal storage, your library, artwork, saves and database are included in RomM's StartOS backup. Shared ROM libraries require a separate file manager backup. Existing installations keep their detected layout during the upgrade.

RomM signs users in with a username and password. StartOS creates the first account rather than leaving its setup wizard open to whoever reaches the address first.

## Getting set up

1. Run **Set Admin Password** and save the username and password it gives you. RomM will not start until you have, which is why it is the only thing you can press at first.
2. Start RomM and wait for both **Database** and **Web Interface** to go green. The first start takes several minutes while the database initialises and your account is created.
3. Open the **RomM Web Interface** and sign in with those credentials.
4. Run **Set Primary URL** and select the address RomM should use for invite and password-reset links. Prefer an HTTPS address.
5. Run **Configure Metadata Providers** and turn on at least one. Without one, a scan finds your files but leaves them with no cover art or descriptions.
6. Add your ROM files using RomM's upload interface or the shared storage option below. A new library uses `library/roms/<platform>/`, with platform names from the upstream documentation. Start with a handful of files before copying a large collection. Existing libraries keep their folder layout when upgraded to RomM 5.3.0.
7. Run a scan from RomM's **Library** screen and check that the games come back with cover art.

## Using RomM

### Web interface

Everything happens here: browsing and searching the collection, editing what a scan got wrong, adding save files and screenshots, managing users, and playing supported systems in the browser.

### Actions

- **Set Admin Password** — generates a new password for the `admin` account and shows it once. Run it again whenever you want a fresh password or have lost the one you had; RomM restarts to apply it, and everyone signed in is signed out.

  If you change the `admin` password from inside RomM instead, this action can no longer replace it — StartOS no longer knows the current one, and the action will tell you so. Use RomM's own profile page from then on.

- **Configure Metadata Providers** — turns each of IGDB, MobyGames, and SteamGridDB on or off, asking for that provider's credentials only when you turn it on. IGDB covers the most ground and is the one to start with; MobyGames fills in descriptions for older titles, and SteamGridDB adds artwork. All three are free to sign up for. Saving restarts RomM.

- **Set Primary URL** — chooses the address RomM uses for invite and password-reset links. Saving a different address restarts RomM. If the saved address disappears, StartOS prompts you to choose another one. RomM keeps running, but new links keep using the saved address until you replace it or restore that address.

- **Remove Retained Library**: permanently deletes a selected inactive internal copy after you have verified the active library and backed it up. This frees space and reduces future backups. Removing the original library also removes the option to recover that copy.

- **Configure Library Storage**: available while RomM is stopped. Queues a copy of the current ROM library into an empty folder in NextExplorer or File Browser, including Quantum, or back into internal storage. Start RomM to run the copy before its web interface starts. The original files remain in place.

### Organizing multi-disc games with a file manager

1. Back up RomM, install NextExplorer or File Browser, and stop RomM.
2. Run **Configure Library Storage**, choose the file manager, and accept the `RomM` folder name or enter another empty folder. The destination needs enough space for a complete copy.
3. Start RomM. It copies the library first, then starts its web interface. Avoid edits in the file manager until copying finishes. Large collections can take a long time. RomM's logs report copied files and bytes every ten seconds.
4. Open the file manager. In NextExplorer, the folder appears as a drive; allow the intended accounts to access it. In File Browser or Quantum, open that folder from the files screen.
5. Open `library/roms/<platform>/` for a new library, or the equivalent existing platform folder. Create a game folder and move that game's disc files into it. Follow RomM's [folder structure guide](https://docs.romm.app/latest/getting-started/folder-structure/) for the layout your library uses.
6. Scan the library in RomM. Check that the grouped game and its discs are detected as expected.

Only `library/` is shared, including its ROM and firmware folders. Keep the hidden `.romm-*` files intact. Saves, screenshots, artwork, database, passwords, configuration and synchronization keys stay in RomM's own storage and backup. The file manager does not need a public address for RomM to use it; an address is useful when you want to manage files through its web interface.

To return to internal storage, stop RomM and select **Internal Storage** in the same action, then start RomM. It copies the current shared files into a new private folder. Old copies remain in place. After checking the active library, use **Remove Retained Library** to remove old internal copies, or delete old external folders in the file manager.

Stop RomM to interrupt a copy. It stops after the current file finishes. Start again to retry in the same destination; the package replaces only its own partial staging files and keeps the source selected until the copy finishes. Other configuration actions wait until you finish or cancel the copy.

To cancel, stop RomM and choose **Cancel Library Copy** in **Configure Library Storage**. This preserves the source and any partial destination files. After cancellation, use a new empty external folder or delete that partial folder in the file manager before starting a new copy. The cleanup action can remove cancelled internal copies.

### Recovering when the file manager is missing

Stop RomM and choose **Recover Internal Library** in **Configure Library Storage**. This selects the original internal library without needing the missing file manager. It uses the files retained from before the move, so later changes in the file manager will not be present. The action also clears an invalid or pending storage selection. If you already removed the original internal copy, restore a backup first.

### Converting an earlier trial installation

If you tested the earlier version that shared `assets/` and `resources/`, it continues using that layout until you change storage. Back up both services, stop RomM, and choose a new empty file-manager folder or internal storage. On Start, the package copies your current saves and artwork back to private storage and copies only the ROM library to the new location. Verify your saves and artwork before deleting the old shared folder.

### Backing up shared storage

Complete or cancel any pending storage copy first. Keep RomM stopped while backing up both RomM and the selected file manager. Avoid edits in the file manager until both backups finish. Restore both matching backups before starting RomM. RomM's backup includes saves and artwork, but does not include the active shared ROM library. Keep the entire selected folder, including hidden `.romm-*` files, in the file manager backup. Earlier trial installations still sharing artwork need both backups to restore it.

## Limitations

Internal libraries and retained internal copies are included in every RomM backup, which can make backups very large. Use **Remove Retained Library** to remove copies you no longer need after checking the active library and taking a backup. Shared libraries require a separate file manager backup. Storage changes copy files into an empty destination and do not delete the originals. Symbolic links and special files cannot be copied by the storage action.
