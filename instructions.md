# RomM

StartOS creates RomM's administrator account for you. Run **Set Admin Password** before you start RomM — the password it gives you is shown once.

## Documentation

- [RomM documentation](https://docs.romm.app) — the upstream guide, including the folder layout for your library and the list of supported platforms.

## What you get on StartOS

A web library for your game collection. Drop ROM files into a folder per console, run a scan, and RomM matches each file against online games databases to fill in cover art, release dates, descriptions, and box scans — then lets you browse, search, and play the supported ones in the browser.

RomM comes with its own database and cache; nothing else needs installing. Your library, artwork, and database are all included in StartOS backups.

This package runs RomM 5.2.0 and configures two scan workers plus three web workers for the service's StartOS CPU allocation.

RomM signs users in with a username and password. StartOS creates the first account rather than leaving its setup wizard open to whoever reaches the address first.

## Getting set up

1. Run **Set Admin Password** and save the username and password it gives you. RomM will not start until you have, which is why it is the only thing you can press at first.
2. Start RomM and wait for both **Database** and **Web Interface** to go green. The first start takes several minutes while the database initialises and your account is created.
3. Open the **RomM Web Interface** and sign in with those credentials.
4. Run **Set Primary URL** and select the browser-facing address RomM should use for links and redirects. Prefer an HTTPS address. StartOS terminates TLS and forwards HTTP internally, so RomM does not need its own HTTPS configuration.
5. Run **Configure Metadata Providers** and turn on at least one. Without one, a scan finds your files but leaves them with no cover art or descriptions.
6. Add your ROM files under `library/`, one folder per console, using the folder names on the Supported Platforms page of the upstream documentation. Start with a handful of files before copying a large collection.
7. Run a scan from RomM's **Library** screen and check that the games come back with cover art.

## Using RomM

### Web interface

Everything happens here: browsing and searching the collection, editing what a scan got wrong, adding save files and screenshots, managing users, and playing supported systems in the browser.

### Actions

- **Set Admin Password** — generates a new password for the `admin` account and shows it once. Run it again whenever you want a fresh password or have lost the one you had; RomM restarts to apply it, and everyone signed in is signed out.

  If you change the `admin` password from inside RomM instead, this action can no longer replace it — StartOS no longer knows the current one, and the action will tell you so. Use RomM's own profile page from then on.

- **Configure Metadata Providers** — turns each of IGDB, MobyGames, and SteamGridDB on or off, asking for that provider's credentials only when you turn it on. IGDB covers the most ground and is the one to start with; MobyGames fills in descriptions for older titles, and SteamGridDB adds artwork. All three are free to sign up for. Saving restarts RomM.

- **Set Primary URL**: chooses the exported StartOS address RomM uses for browser-facing links, redirects, and invite URLs. Run it again after changing gateways or addresses. If the saved address disappears, StartOS prompts you to choose another one while RomM remains able to start.

## Limitations

Your ROM library is stored with the rest of RomM's data and is included in every backup, which can make backups very large. It cannot be moved to separate storage or left out.
