# ForgeMind Atlassian Companion

This directory contains ForgeMind's independently deployed Atlassian Forge app. It is intentionally separate from the Tauri desktop package under `app/`: Forge dependencies, authentication, deployment, and installation stay inside this companion boundary.

ATL-BOOT-1 provides only a TypeScript UI Kit bootstrap page in Jira. It displays **ForgeMind Atlassian Companion** and **Connected to Atlassian Forge**. It does not publish to Confluence, create or update Jira work items, define a Rovo agent or action, synchronize data, call ForgeMind providers, or communicate with the desktop app.

## Development environment

- Forge CLI: `@forge/cli` 15.0.0
- Validated Node runtime: 24.22.1
- Authentication: use `forge login` with a personal/development Atlassian account and a Forge-scoped API token stored by the operating-system credential store. Never commit tokens or credential caches.
- Development site: `https://one-atlas-ljtg.atlassian.net` (personal Forge demo site; expires 2027-02-01)
- Demo products: Jira, Confluence, Jira Service Management, and Rovo

The app requests no product OAuth scopes and declares no external egress:

```yaml
permissions:
  scopes: []
```

## Validate, deploy, and install

Run commands from this directory with a Forge-supported Node runtime:

```powershell
npm.cmd run typecheck
npm.cmd run lint
forge lint
forge deploy --non-interactive --environment development
forge install --non-interactive --site one-atlas-ljtg.atlassian.net --product jira --environment development
```

Use `forge install --non-interactive --upgrade ...` only after an installed app's scopes or permissions change.

## Future boundary

The preferred first integration remains an explicit, user-authorized handoff:

`ForgeMind Desktop -> serialized integration DTO -> Forge companion -> Atlassian products`

Project Brain export schema version 1 is a suitable source because it already carries stable identity, section hierarchy, authority, lifecycle, provenance, timestamps, structured details, and references while excluding credentials, provider payloads, hidden reasoning, absolute paths, usage/cost metadata, and failed analysis. A separate versioned integration DTO should select the fields intended for Atlassian publishing and keep the Forge app decoupled from Rust types. No transport or DTO is implemented in ATL-BOOT-1.
