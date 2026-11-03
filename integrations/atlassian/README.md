# ForgeMind Atlassian Companion

This directory contains ForgeMind's independently deployed Atlassian Forge app. It is intentionally separate from the Tauri desktop package under `app/`: Forge dependencies, authentication, deployment, and installation stay inside this companion boundary.

ATL-BOOT-1 provides the TypeScript UI Kit bootstrap page in Jira. FM-ATL-DTO-1 adds an ephemeral paste-and-validate surface for `AtlassianProjectSnapshot` version `1`. It does not publish to Confluence, create or update Jira work items, define a Rovo agent or action, synchronize data, call ForgeMind providers, or communicate with the desktop app.

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
npm.cmd test
forge lint
forge deploy --non-interactive --environment development
forge install --non-interactive --site one-atlas-ljtg.atlassian.net --product jira --environment development
```

Use `forge install --non-interactive --upgrade ...` only after an installed app's scopes or permissions change.

## Manual snapshot boundary

The preferred first integration remains an explicit, user-authorized handoff:

`ForgeMind Desktop -> serialized integration DTO -> Forge companion -> Atlassian products`

The desktop's explicit **Create Atlassian Snapshot** action writes `.forgemind/exports/atlassian-project-snapshot.json`. The user may paste that JSON into this companion and choose **Validate Snapshot**. Validation shows project name, portable Project ID, schema version, section count, and entry count; the raw JSON remains only in transient component state.

Snapshot schema version `1` accepts only Project Brain export version `1`. The independently defined DTO selects stable identity, fixed section order, real status/authority, safe provenance, timestamps, content details, and existing references. It omits authors, internal source IDs, provider/model/profile metadata, usage, diagnostics, credentials, hidden reasoning, and absolute paths. The shared fixture is `contracts/fixtures/atlassian-project-snapshot-v1.json`.

There is no automatic transport, API resolver, companion persistence, deployment requirement, Confluence publishing, Jira issue integration, Rovo agent, or synchronization in FM-ATL-DTO-1.
