# ForgeMind Atlassian Companion

This directory contains ForgeMind's independently deployed Atlassian Forge app. It is intentionally separate from the Tauri desktop package under `app/`: Forge dependencies, authentication, deployment, and installation stay inside this companion boundary.

ATL-BOOT-1 provides the TypeScript UI Kit bootstrap page in Jira. FM-ATL-DTO-1 adds an ephemeral paste-and-validate surface for `AtlassianProjectSnapshot` version `1`. CONF-1 adds explicit one-way publication after validation, space selection, and preview. CONF-2 adds an installation-local page mapping so later snapshots can explicitly update the same page. ForgeMind remains authoritative; the companion has no reverse sync, automatic publishing, Jira write behavior, Rovo action, provider call, or desktop transport.

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
    - read:page:confluence
    - write:page:confluence
    - storage:app
```

- `read:space:confluence` lists spaces visible to the current Forge user so the user can explicitly select a destination.
- `read:page:confluence` verifies the mapped page and reads its current version.
- `write:page:confluence` creates or explicitly updates the user-approved page.
- `storage:app` stores installation-local publication mapping metadata only.

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

After validation, the companion calls Confluence REST API v2 through Forge's current-user `requestConfluence` bridge. A dedicated service lists spaces, reads mapped pages, creates pages, and updates pages with the required next version; the UI contains no direct REST request construction. A separate renderer converts the snapshot into an internal `ConfluencePageDraft` and escaped storage-format body. The preview displays project, destination or mapped page, editable title, section/entry counts, and the authority notice before enabling the appropriate explicit action.

When no mapping exists, **Publish new page to Confluence** creates exactly one root page and saves metadata only after Confluence confirms the page ID. The KVS key is `confluence-publication:v1:<projectId>` and the schema stores only project/page/space identity, descriptive title, timestamps, source schema version, and a content fingerprint—never snapshot or page bodies. The hosted resolver exists only for this installation-local KVS boundary.

When a mapping exists, the companion verifies the page and shows `UP TO DATE`, `OUTDATED`, `MAPPED PAGE MISSING`, or `ACCESS ERROR`. **Update existing page** revalidates the snapshot and mapping, reads the current page version, and sends one explicit update to the same page ID and space. It may update the title and managed body. A `409` is not forced or retried. A missing page can be recovered only by explicitly forgetting the KVS mapping; this does not change Project Brain or Confluence. Manual edits are not imported and may be replaced by an explicit update. There is no automatic transport, polling, synchronization, reverse import, space move, child-page tree, Jira issue integration, Rovo, or MCP dependency.

The content fingerprint is `fnv1a64-v1` over the exact draft title and storage body in deterministic order. It is a change detector, not a security primitive. The rendered generated timestamp is intentionally visible page content, so a changed timestamp changes the fingerprint.
