# Unity Bridge boundary

Milestone 0I.2 adds the first separately bounded Unity Editor package at [`com.forgemind.unity-groundtruth`](com.forgemind.unity-groundtruth/README.md).

The package exposes **Tools > ForgeMind > Export GroundTruth** and emits the existing project-owned `.forgemind/unity-groundtruth.json` contract. It does not grant ForgeMind live Unity control, run tests, execute the game, or modify project content. ForgeMind remains a read-only consumer of the exported evidence.

See [Unity GroundTruth Contract](../docs/UNITY_GROUNDTRUTH.md) and [Architecture](../docs/ARCHITECTURE.md).
