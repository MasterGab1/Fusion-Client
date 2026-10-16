# Enable Microsoft sign-in for Fusion

Fusion is a Windows desktop launcher. It does not ship a borrowed Microsoft client ID. You need a Microsoft application registration belonging to your project, and that application must be permitted to access Minecraft Java services.

## Local testing without Microsoft sign-in

Open the account button, choose **Local testing**, enter a name (3–16 letters, numbers or underscores), and click **Use local profile**. Launch normally from Play or My packs. Press Right Shift in a world to open Fusion's menu. No Microsoft session is used in this mode. Online-mode servers and account skin uploads require Microsoft authentication. The first launch still downloads game files and Java from the official services.

Choose the Microsoft tab to return to a Microsoft account. A failed Microsoft sign-in never silently switches to local testing.

## Test with your official Minecraft Launcher account

If Fusion's direct sign-in is rejected, you can prepare a Fusion installation for the official Minecraft Launcher:

1. Install and sign into the official Minecraft Launcher, then close it so its installation file is not being edited.
2. In Fusion, choose the Minecraft version and loader, and install any community mods you want.
3. Open **Sign in → Prepare Fusion installation**. Wait for preparation to finish.
4. Open Minecraft Launcher → **Installations**, enable the **Modded** filter if necessary, and play the generated **Fusion** installation.

Minecraft Launcher handles account authentication. Fusion does not read its account database or copy its tokens. This does not sign the Fusion UI into your account or enable account skin uploads there. Existing installations and their selected profile are preserved, with a backup before writing. Fusion game folders remain separate from your ordinary Minecraft worlds. This path has automated profile/argument checks but still needs a real-account gameplay check.

## Fix the reported redirect error

You already supplied application ID **7d62351c-268c-4fbe-95d5-89611193ab12**. You do not need a client secret or a new key. Open **Entra → App registrations → your Fusion application → Authentication**, add the **Mobile and desktop applications** platform and register **http://localhost**, then save. If the platform already exists, edit its redirect URIs. The temporary port is handled by Microsoft’s localhost matching rule. Fusion uses the root path `/`, not `/callback`.

The setting must be saved in Microsoft’s portal; a launcher rebuild cannot register it. If you cannot find that application, sign into the directory/account that owns it and confirm the ID is an Application (client) ID rather than a Directory (tenant) ID. Only create a new registration if the previous ID was not your application; the new public Application ID would then need to be bundled into Fusion.

## 1. Register the application

Open [Microsoft Entra](https://entra.microsoft.com/) and go to **Identity → Applications → App registrations → New registration**. Name it **Fusion Launcher**. Select an account type that includes **personal Microsoft accounts** (either personal accounts only, or organizational directories and personal accounts).

If your account cannot create registrations, you will need access to an Entra tenant that allows app registration. Do not buy an Azure subscription just to guess at a solution: check the account's registration permissions first.

## 2. Enable browser sign-in

Under **Authentication → Add a platform**, choose **Mobile and desktop applications** and add **http://localhost** as a redirect URI. Fusion listens on a temporary loopback port for the callback. Register the base URI without a fixed port. Menu labels can vary between Entra portal versions.

Fusion is a public desktop client and uses authorization code flow with PKCE (`S256`) and `XboxLive.signin offline_access`. The default browser opens Microsoft's account page and returns to Fusion automatically: no device code to copy. Fusion checks a random callback state and exchanges the code in the main process. No client secret is needed; never embed one in a desktop app.

Fusion supports browser authorization with PKCE only. There is no device-code fallback.

`offline_access` is Microsoft's name for permission to renew a session. It does **not** enable offline Minecraft in Fusion. Fusion refreshes the session and verifies the Minecraft license and profile online before every game launch.

Microsoft's protocol documentation: [Authorization code flow and PKCE](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow), [Registered redirect URIs](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url).

## 3. Confirm Minecraft Java API access

App registration and successful Microsoft/Xbox login do not by themselves guarantee Minecraft API access. New client IDs can be rejected by `api.minecraftservices.com` with HTTP 403 / invalid app registration.

Check the current application review/access requirements with [Minecraft Support](https://help.minecraft.net/). Ask specifically about access to **Minecraft Java Edition Game Service APIs for a third-party desktop launcher**, and provide your application's client ID and purpose. The publisher must complete any required review. A client ID from another launcher is not a substitute.

If the service rejects the application, Fusion displays an explicit error. There is no offline fallback. This build's real-account sign-in and game launch cannot be verified until your permitted client ID is available.

## 4. Configure Fusion

Fusion uses the supplied public client ID **7d62351c-268c-4fbe-95d5-89611193ab12**, bundled in package.json. This identifier is not a secret. Players do not configure it.

Click **Launch** to open Microsoft in your browser and continue launching after sign-in. To sign in without launching, use the account button in the title bar. Fusion checks Xbox authorization, Minecraft ownership and the Java profile before saving the encrypted session. The publisher must still ensure this registration has the redirect and API access described above. Real-account sign-in with this registration has not been verified by automated fixtures.

## Account requirements and storage

- The Microsoft account must have an Xbox profile and a Minecraft: Java Edition license and username. Child accounts may need a parent to configure Xbox/family permissions.
- Passwords are entered only on Microsoft's website. Fusion never asks for them.
- The refresh token is encrypted by Electron `safeStorage` using Windows protection, then saved at `%APPDATA%\Fusion Launcher\account.bin`. Game access tokens are kept in the main process and provided to Java only when launching.
- Sign out removes the locally saved encrypted account. To revoke consent at Microsoft too, use your Microsoft account's application permission controls.
- Each launch requires working Microsoft, Xbox, and Minecraft services. Cached versions can be browsed while disconnected, but the launcher cannot start Minecraft without online verification.
- This prevents unauthenticated/offline **launches through Fusion**. It does not disable Minecraft single-player or police the connection after the game starts. It also cannot prevent someone from modifying open-source launcher code.

## Common issues

**Client ID rejected immediately:** verify the Application (client) ID, personal account support, and public client flow setting.

**Browser redirect rejected:** check that `http://localhost` is registered under **Mobile and desktop applications**, not as a Web or SPA platform. Save changes and retry.

**Minecraft rejects the app registration:** resolve Minecraft Java API permission/review with the service owner. Changing a redirect URL or adding a secret will not make a disallowed client ID work.

**No Java license/profile:** sign in with the account that owns Java Edition and finish profile setup at [Minecraft](https://www.minecraft.net/en-us/msaprofile).

**Connection unavailable:** restore internet access and retry. Fusion deliberately refuses to launch offline.

**Java failure:** choose Automatic Java. Custom Java must match the major version required by the selected Minecraft build.

## Current sign-in error

The redirect error and the Minecraft rejection are different stages. If Microsoft and Xbox succeed but Minecraft rejects `login_with_xbox`, adding another redirect URI or generating a client secret will not resolve Minecraft's decision.

Open [Minecraft's Java Edition support category](https://help.minecraft.net/hc/en-us/sections/44460521913485), then **Java Edition Game Service API Review or Application Process**. Follow the current process for application **7d62351c-268c-4fbe-95d5-89611193ab12**. Only Minecraft can grant the application access. Fusion now distinguishes an explicit invalid-registration response from an unspecified HTTP 403; the latter alone does not establish that approval is the cause.
