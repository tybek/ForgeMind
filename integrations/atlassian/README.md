# ForgeMind Atlassian Companion

This directory contains ForgeMind's independently deployed Atlassian Forge app. It is intentionally separate from the Tauri desktop package under `app/`: Forge dependencies, authentication, deployment, and installation stay inside this companion boundary.

ATL-BOOT-1 provides the TypeScript UI Kit bootstrap page in Jira. FM-ATL-DTO-1 adds an ephemeral paste-and-validate surface for `AtlassianProjectSnapshot` version `1`. CONF-1 adds explicit one-way publication of one new derived Confluence page after validation, space selection, and preview. ForgeMind remains authoritative; the companion has no reverse sync, update-existing-page behavior, page mapping, Jira write behavior, Rovo action, provider call, or desktop transport.

## Development environment

- Forge CLI: `@forge/cli` 15.0.0
- Validated Node runtime: 24.22.1
- Authentication: use `forge login` with a personal/development Atlassian account and a Forge-scoped API token stored by the operating-system credential store. Never commit tokens or credential caches.
- Development site: `https://one-atlas-ljtg.atlassian.net` (personal Forge demo site; expires 2027-02-01)
- Demo products: Jira, Confluence, Jira Service Management, and Rovo

The same Forge app ID uses current multi-app compatibility with Jira required and Confluence optional. It declares no external egress and requests only:

```yaml
permissions:
  scopes:
    - read:space:confluence
    - write:page:confluence
```

- `read:space:confluence` lists spaces visible to the current Forge user so the user can explicitly select a destination.
- `write:page:confluence` creates the single user-approved page.

No Jira write, content-property, delete, admin, external-egress, or unrelated read scope is requested.

## Validate, deploy, and install

Run commands from this directory with a Forge-supported Node runtime:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
forge lint
forge deploy --non-interactive --environment development
forge install --upgrade --non-interactive --site one-atlas-ljtg.atlassian.net --product jira --environment development
forge install --non-interactive --site one-atlas-ljtg.atlassian.net --product confluence --environment development
```

The scope change produces a major version and requires explicit approval. Upgrade the Jira-required installation first, then run the Confluence install command to connect the optional product on the same development site. Verify `forge install list --json` reports one shared installation identity with `Jira (Required), Confluence`; stop rather than bypassing any permission or administrator confirmation Forge requires.

## Manual snapshot boundary

The preferred first integration remains an explicit, user-authorized handoff:

`ForgeMind Desktop -> serialized integration DTO -> Forge companion -> Atlassian products`

The desktop's explicit **Create Atlassian Snapshot** action writes `.forgemind/exports/atlassian-project-snapshot.json`. The user may paste that JSON into this companion and choose **Validate Snapshot**. Validation shows project name, portable Project ID, schema version, section count, and entry count; the raw JSON remains only in transient component state.

Snapshot schema version `1` accepts only Project Brain export version `1`. The independently defined DTO selects stable identity, fixed section order, real status/authority, safe provenance, timestamps, content details, and existing references. It omits authors, internal source IDs, provider/model/profile metadata, usage, diagnostics, credentials, hidden reasoning, and absolute paths. The shared fixture is `contracts/fixtures/atlassian-project-snapshot-v1.json`.

## Explicit Confluence publishing

After validation, the companion calls Confluence REST API v2 through Forge's current-user `requestConfluence` bridge. A dedicated service lists spaces and creates pages; the UI contains no direct REST request construction. A separate renderer converts the snapshot into an internal `ConfluencePageDraft` and escaped storage-format body. The preview displays project, selected space, editable title, section/entry counts, authority summary, and the authority notice before enabling **Publish new page to Confluence**.

Each successful click creates exactly one new root page. The pending state and single-flight guard block concurrent duplicate POSTs, and no POST is automatically retried. The page ID remains transient and is never written to Project Brain or Forge Storage. Manual Confluence edits are not read back. There is no automatic transport from desktop, update, delete, polling, synchronization, reverse import, child-page tree, Jira issue integration, or Rovo implementation.
