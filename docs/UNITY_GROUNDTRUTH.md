# Unity GroundTruth Contract

## 0I.1 contract and 0I.2 exporter

Milestone 0I established the completed read-only Unity Reality boundary. ForgeMind detects portable Unity project evidence, reads the editor version, validates a project-owned GroundTruth manifest, and provides an editor-only Unity package that generates that contract from explicit user action. ForgeMind still does not run or automate Unity or modify scenes and assets. The completed Alignment workflow may use only ForgeMind's normalized, bounded Unity evidence projection; it does not change this manifest or treat component presence as proof of runtime behavior.

The preferred manifest location is:

```text
.forgemind/unity-groundtruth.json
```

The manifest is point-in-time implementation evidence. It is not design truth, a live Unity connection, or proof that an intended feature is complete.

## Unity Editor package

The UPM package lives at `unity/com.forgemind.unity-groundtruth` and supports Unity 2021.3 or newer. Install it through Unity Package Manager's **Add package from disk** action, then choose:

```text
Tools > ForgeMind > Export GroundTruth
```

The Unity project must already contain a valid `.forgemind/project.json`; the exporter uses its portable Project ID and never initializes or repairs workspace metadata. A successful export reports scene, GameObject, component, and ScriptableObject counts in the Unity Editor. A failed export shows a safe actionable message and does not knowingly leave a malformed manifest in place.

The only durable project output is `.forgemind/unity-groundtruth.json`. The package does not edit or save scenes, prefabs, ScriptableObjects, Project Settings, assets, source, or package configuration.

## Detection

ForgeMind checks the active initialized workspace through one narrow native command. NEXT-1.1 may first resolve an explicitly selected Unity project folder from project-scoped machine-local connection settings; without one, inspection uses the ForgeMind workspace root. It reports the independent presence of `Assets/`, `Packages/`, and `ProjectSettings/`; the selected source is detected as a Unity project when all three canonical directories are present. The Unity editor version is parsed from `ProjectSettings/ProjectVersion.txt` and has separate Available, Missing, and Invalid states.

NEXT-1.2 separates that portable source inspection from project-owned evidence. `Assets/`, `Packages/`, `ProjectSettings/`, and `ProjectVersion.txt` are read from the resolved Unity source, but `.forgemind/unity-groundtruth.json` is read only from the active ForgeMind project root and validated against that project's portable ID. A detached Reality source is not equivalent to project-owned ForgeMind evidence. A manifest found only inside a foreign detached source is never imported, copied, or projected into the active project's GroundTruth or Alignment evidence. If the active project owns a valid manifest, it continues to load even while portable inspection uses a detached Unity source.

Folder selection uses the native directory picker and never starts an automatic scan. The machine path is kept only in application-local adapter settings, never returned as evidence or copied into portable `.forgemind` truth. Change and Disconnect update only that local mapping. A missing configured folder fails safely and does not invalidate the ForgeMind workspace.

## Format version 1

The version 1 document is strict and project-bound:

```json
{
  "formatVersion": 1,
  "projectId": "portable-forgemind-project-id",
  "generatedAt": "2026-09-20T12:00:00Z",
  "unityVersion": "6000.3.23f1",
  "source": {
    "kind": "UNITY_EDITOR_EXPORT",
    "toolVersion": "0.1.0"
  },
  "coverage": {
    "categories": ["SCENES", "COMPONENTS"],
    "errors": []
  },
  "observations": {
    "scenes": [],
    "gameObjects": [],
    "components": [],
    "serializedFields": [],
    "prefabReferences": [],
    "scriptableObjects": [],
    "tags": [],
    "layers": [],
    "inputActions": [],
    "tests": []
  }
}
```

All observation arrays are required so coverage is explicit. Empty means the exporter reported no records in that collection; it is evidence of absence only when the matching category is listed in `coverage.categories` and exporter coverage is sufficient. A matching coverage issue makes the affected category partial or unavailable rather than verified absence. Codes ending in `_TRUNCATED` mean the exporter reached its safe 10,000-observation per-category bound, so the retained count is a minimum rather than an exact total.

Supported coverage categories are `SCENES`, `GAME_OBJECTS`, `COMPONENTS`, `SERIALIZED_FIELDS`, `PREFAB_REFERENCES`, `SCRIPTABLE_OBJECTS`, `TAGS_LAYERS`, `INPUT_ACTIONS`, and `TESTS`. Coverage errors contain only a category and a bounded uppercase error code. They do not contain exception text, stack traces, machine paths, or source contents.

The minimal observation shapes are:

- scene: project-relative `id` and Unity asset `path`
- GameObject: project-relative `id`, `sceneId`, and hierarchy identifier `hierarchyPath`
- component / MonoBehaviour: project-relative `id`, `gameObjectId`, type name, and optional project-relative `scriptPath`
- serialized field: `componentId`, field name, type name, and optional project reference; raw field values are excluded
- prefab reference: `ownerId` and project-relative asset `path`
- ScriptableObject: project-relative `id`, asset `path`, and type name
- tag: name only; layer: index from 0 through 31 and name
- Input Action: project-relative asset path, map name, and action name
- test metadata: assembly name, platform label, and non-negative test count

The schema is intentionally metadata-oriented. Future exporter milestones may add evidence with a new format version or a deliberately compatible contract update after validation against real Unity projects.

## 0I.2 collection behavior

- `SCENES` contains enabled Build Settings scenes. Scenes not already loaded are opened additively one at a time for inspection and closed without saving. Disabled scenes and scenes outside Build Settings are not claimed as covered.
- `GAME_OBJECTS`, `COMPONENTS`, `SERIALIZED_FIELDS`, and `PREFAB_REFERENCES` come from those scenes. Hierarchy names are escaped into portable identifiers; component records include MonoBehaviour type and project-relative script path where available. Serialized fields contain only top-level property name/type metadata and optional project asset references, never raw values.
- `SCRIPTABLE_OBJECTS` is discovered from project assets under `Assets/`, including stable GUID/local-file identities where Unity provides them.
- `TAGS_LAYERS` uses Unity's Editor settings APIs and retains layer indexes.
- `INPUT_ACTIONS` is collected through the installed Input System API when present. The exporter does not add an Input System dependency.
- `TESTS` counts discoverable compiled NUnit and Unity Test Framework test attributes by EditMode/PlayMode assembly label. It does not execute tests.

Collections are capped at 10,000 observations per category to match ForgeMind validation and use deterministic ordinal ordering. Portable SHA-256 identities distinguish scenes, hierarchy objects, and components without exporting machine paths. The contract-required `generatedAt` value changes on every export; observations remain stably ordered for meaningful diffs.

Malformed project metadata stops the export. Unsupported or unreadable evidence inside an otherwise valid project produces a bounded uppercase coverage code where safe. Exception strings, stack traces, file contents, raw values, credentials, and machine identity are not exported.

## Validation and safety

ForgeMind accepts only format version `1`, a matching ForgeMind `projectId`, an RFC 3339 `generatedAt`, bounded supported enums and collections, and forward-slash project-relative paths and identifiers. Absolute paths, parent traversal, Windows path separators, unknown fields, malformed JSON, and unsupported versions are rejected.

The manifest has no credential, authorization, raw source, raw serialized-value, provider-response, or machine-identity fields. The frontend receives only detection state and a normalized manifest summary with timestamps, coverage categories, observation counts, and safe coverage issue category/code/classification. Bounded truncation, unsupported evidence, and inspection errors remain visibly distinct. It never receives raw manifest observations or arbitrary filesystem access.

## Provenance semantics

- **VERIFIED FROM UNITY**: facts directly observed from canonical Unity project structure or a manifest that passed native validation.
- **DOCUMENTED**: project Intent stored in the Compendium or Decisions. It is not copied into the GroundTruth manifest.
- **AI INFERENCE**: interpretation produced by AI. 0I.1 produces none.

An Available manifest is verified implementation evidence from its stated export time. **Not attached** means portable Unity source inspection succeeded but the active ForgeMind project owns no attached GroundTruth export. **Not generated** means the active, non-detached project root has no export. Invalid, missing-version, and non-Unity states supply no positive Unity GroundTruth evidence. Only a malformed or unsupported manifest owned by the active project is Invalid; a foreign or unattached manifest is not an error. ForgeMind must not fill those gaps with inference.

## Connection and page-state semantics

- **Unknown / not inspected:** no current-session result; Home may recommend **Inspect Unity Reality**.
- **Connected:** canonical Unity directories are detected. Portable structure/version inspection may succeed even when project-owned GroundTruth is Not attached or Not generated.
- **Not connected:** inspection found no Unity project at the resolved source; Home recommends **Connect Unity Project** and the page offers **Select Unity Project Folder**.
- **Portable inspection only:** the connected Unity source can be inspected, but the active ForgeMind project has no attached manifest. Home recommends **Complete Unity GroundTruth** and routes to **Review Unity Evidence**.
- **Partial:** a valid project-owned manifest contains bounded truncation, unsupported categories, or exporter errors. Home recommends **Review Partial Unity Evidence**; it does not imply that Refresh can repair exporter coverage.
- **Error:** a selected path disappeared, an active-project manifest is invalid, or inspection failed. Red is reserved for these actual failures; not connected, not attached, and not generated remain amber or muted neutral.

The page leads with Connection, Unity version, GroundTruth manifest, and Coverage. Manifest vocabulary is Available, Not attached, Not generated, or Invalid; coverage is Verified, Partial, Portable inspection only, or No evidence. The evidence-type legend is behind compact **About evidence types** help, and missing workspace structure plus project-owned GroundTruth are shown as compact inspection summaries. Missing evidence remains unverified, not proof of absence.

**Refresh Evidence** is read-only: it re-reads the current source and active-project manifest. It does not run the Unity exporter, generate or attach a manifest, increase exporter limits, or resolve `SERIALIZED_FIELDS_TRUNCATED` and other persistent coverage issues.

## Explicit non-goals

The Unity package includes no ForgeMind-driven Unity automation, scene or asset modification, source generation, live synchronization, runtime simulation, test execution, private data from another project, or automatic Intent comparison. The private dogfood project manual export, mutation/revert check, bounded technical question, and partial-coverage verification passed; milestone 0I is complete. Alignment remains a separate ForgeMind domain that consumes only safe normalized evidence.
