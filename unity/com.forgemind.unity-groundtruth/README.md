# ForgeMind Unity GroundTruth exporter

This editor-only UPM package exports the ForgeMind format-version `1` Reality manifest from a Unity project. It adds:

```text
Tools > ForgeMind > Export GroundTruth
```

## Install from disk

1. Initialize the Unity project as a ForgeMind workspace so `.forgemind/project.json` exists.
2. In Unity Package Manager, choose **Add package from disk**.
3. Select this package's `package.json`.
4. Run **Tools > ForgeMind > Export GroundTruth**.

The only durable project output is `.forgemind/unity-groundtruth.json`. The exporter reads project metadata, enabled Build Settings scenes, assets, compiled assemblies, tags, layers, and optional Input System metadata. It never saves or modifies a scene, prefab, ScriptableObject, Project Setting, source file, or package.

## Evidence and limits

- Enabled Build Settings scenes are inspected one at a time with additive Editor loading when they are not already open. Disabled scenes and scenes outside Build Settings are not claimed as covered.
- GameObject hierarchy, components, MonoBehaviour script paths, top-level serialized-property metadata, deterministic prefab asset references, and ScriptableObject metadata are exported without raw serialized values.
- Input Actions are exported through the installed Input System API when it is available. No Input System dependency is added by this package.
- Test counts are discovered from compiled NUnit and Unity Test Framework attributes. Tests are not executed.
- Coverage errors are bounded uppercase codes. Exceptions, stack traces, source contents, absolute paths, credentials, and machine identity are not exported.
- Collections are ordered deterministically and capped at the format-v1 maximum of 10,000 observations per category. The required top-level export time is the only intentionally changing value for otherwise unchanged project state.

If a source cannot be inspected safely, the exporter records a safe coverage issue code or fails before replacing the manifest. Each observation category is capped at 10,000 records; reaching that bound records a `_TRUNCATED` issue so consumers can present the retained count as partial coverage. It does not infer design intent or feature completion.

## EditMode tests

When this package is included in a Unity project's testable packages, its EditMode suite covers deterministic ordering, portable paths, scene hierarchy, component and serialized-field metadata, ScriptableObject metadata, tags/layers, and malformed project metadata. No PlayMode run is required.
