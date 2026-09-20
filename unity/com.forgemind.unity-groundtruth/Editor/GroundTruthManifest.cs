using System;

namespace ForgeMind.UnityGroundTruth
{
    [Serializable]
    internal sealed class GroundTruthManifest
    {
        public int formatVersion = 1;
        public string projectId;
        public string generatedAt;
        public string unityVersion;
        public GroundTruthSource source = new GroundTruthSource();
        public GroundTruthCoverage coverage = new GroundTruthCoverage();
        public GroundTruthObservations observations = new GroundTruthObservations();
    }

    [Serializable]
    internal sealed class GroundTruthSource
    {
        public string kind = "UNITY_EDITOR_EXPORT";
        public string toolVersion = GroundTruthExporter.ToolVersion;
    }

    [Serializable]
    internal sealed class GroundTruthCoverage
    {
        public string[] categories = Array.Empty<string>();
        public CoverageError[] errors = Array.Empty<CoverageError>();
    }

    [Serializable]
    internal sealed class CoverageError
    {
        public string category;
        public string code;

        public CoverageError(string categoryValue, string codeValue)
        {
            category = categoryValue;
            code = codeValue;
        }
    }

    [Serializable]
    internal sealed class GroundTruthObservations
    {
        public SceneObservation[] scenes = Array.Empty<SceneObservation>();
        public GameObjectObservation[] gameObjects = Array.Empty<GameObjectObservation>();
        public ComponentObservation[] components = Array.Empty<ComponentObservation>();
        public SerializedFieldObservation[] serializedFields = Array.Empty<SerializedFieldObservation>();
        public ProjectReference[] prefabReferences = Array.Empty<ProjectReference>();
        public ScriptableObjectObservation[] scriptableObjects = Array.Empty<ScriptableObjectObservation>();
        public string[] tags = Array.Empty<string>();
        public LayerObservation[] layers = Array.Empty<LayerObservation>();
        public InputActionObservation[] inputActions = Array.Empty<InputActionObservation>();
        public TestMetadataObservation[] tests = Array.Empty<TestMetadataObservation>();
    }

    [Serializable]
    internal sealed class SceneObservation
    {
        public string id;
        public string path;
    }

    [Serializable]
    internal sealed class GameObjectObservation
    {
        public string id;
        public string sceneId;
        public string hierarchyPath;
    }

    [Serializable]
    internal sealed class ComponentObservation
    {
        public string id;
        public string gameObjectId;
        public string typeName;
        public string scriptPath;
    }

    [Serializable]
    internal sealed class SerializedFieldObservation
    {
        public string componentId;
        public string name;
        public string typeName;
        public ProjectReference reference;
    }

    [Serializable]
    internal sealed class ProjectReference
    {
        public string ownerId;
        public string path;
    }

    [Serializable]
    internal sealed class ScriptableObjectObservation
    {
        public string id;
        public string path;
        public string typeName;
    }

    [Serializable]
    internal sealed class LayerObservation
    {
        public int index;
        public string name;
    }

    [Serializable]
    internal sealed class InputActionObservation
    {
        public string assetPath;
        public string mapName;
        public string actionName;
    }

    [Serializable]
    internal sealed class TestMetadataObservation
    {
        public string assemblyName;
        public string platform;
        public int testCount;
    }

    [Serializable]
    internal sealed class ForgeMindProjectMetadata
    {
        public int formatVersion;
        public string projectId;
        public string name;
        public string createdAt;
    }

    internal sealed class ExportCounts
    {
        public int Scenes;
        public int GameObjects;
        public int Components;
        public int ScriptableObjects;
    }
}
