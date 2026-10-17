# Privacy

Updated 17 October 2026

Fusion is a desktop Minecraft launcher maintained by Fusion. This notice describes the current application. For privacy questions, contact the repository maintainer through the GitHub profile linked from the Fusion repository.

## On your computer

Fusion saves preferences, local player names, skins, downloaded files, mod selections, and game instances in its Windows application-data folder. Your Minecraft profile and renewable Microsoft sign-in session are stored locally; the saved session uses Windows-backed Electron secure storage. Fusion does not ask for or store your Microsoft password.

Game output is displayed locally and Minecraft can write logs inside its instance folders. Those logs can contain player names, server addresses, and file paths. Fusion does not automatically upload them. Review logs and screenshots before sharing them with anyone.

## Connections you use

Microsoft, Xbox and Minecraft services receive sign-in requests when you choose Microsoft login, refresh a session, check ownership, or apply an account skin. Your browser handles Microsoft login. The official-launcher handoff does not import its account tokens.

Minecraft and Java download providers receive file requests. Modrinth receives mod and modpack searches and installation requests; selected packs may download from their declared supported hosts. Minecraft services receive player-name skin lookups and news requests. As with other internet connections, these providers can receive your IP address and request information. Their own privacy terms apply.

GitHub receives update checks and downloads. For a private release, Fusion can obtain a GitHub credential from your local Git Credential Manager for the request. It is kept in memory and is not included in the launcher, settings, output, or release files.

Discord Rich Presence is optional. When enabled, Fusion sends launcher/game activity, including the Minecraft version and elapsed time, to your running Discord client. Discord controls how that activity is shown. Turn it off in Settings → Launcher.

## Your choices

You can use a local testing profile without Microsoft sign-in. It does not authenticate to online-mode servers. Downloads, news and enabled update checks can still connect to their providers.

Sign out to remove Fusion's saved Microsoft session. Disable automatic update checks and Discord Presence in Settings. You can remove skins and mod instances you no longer need. The uninstaller preserves application data so worlds and preferences survive reinstalling; after backing up anything you want to keep, you can delete Fusion's data folder yourself.

Fusion has no advertising SDK, analytics SDK, or automatic crash-report upload in this build. The maintainer does not operate a telemetry server for the launcher. If you voluntarily send a support report, its contents are visible to its recipients and the service used to send it. Do not post passwords or tokens.

## Questions and rights

Depending on applicable law, you may have rights to access, correct, erase, or restrict processing of personal data held about you, and to complain to your local data-protection authority. Fusion's maintainer cannot access the files stored only on your computer. For data held by Microsoft, Discord, GitHub, Modrinth, or other providers, use that provider's privacy controls and contact channels. This notice does not replace their policies.
