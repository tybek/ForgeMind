using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEditor.Compilation;
using UnityEditor.SceneManagement;
using UnityEditorInternal;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace ForgeMind.UnityGroundTruth
{
    internal static class GroundTruthCategories
    {
        internal const string Scenes = "SCENES";
        internal const string GameObjects = "GAME_OBJECTS";
        internal const string Components = "COMPONENTS";
        internal const string SerializedFields = "SERIALIZED_FIELDS";
        internal const string PrefabReferences = "PREFAB_REFERENCES";
        internal const string ScriptableObjects = "SCRIPTABLE_OBJECTS";
        internal const string TagsLayers = "TAGS_LAYERS";
        internal const string InputActions = "INPUT_ACTIONS";
        internal const string Tests = "TESTS";

        internal static readonly string[] All =
        {
            Scenes,
            GameObjects,
            Components,
            SerializedFields,
            PrefabReferences,
            ScriptableObjects,
            TagsLayers,
            InputActions,
            Tests
        };
    }

    internal sealed class GroundTruthCollection
    {
        internal const int MaximumObservationsPerCategory = 10000;

        internal readonly List<SceneObservation> Scenes = new List<SceneObservation>();
        internal readonly List<GameObjectObservation> GameObjects = new List<GameObjectObservation>();
        internal readonly List<ComponentObservation> Components = new List<ComponentObservation>();
        internal readonly List<SerializedFieldObservation> SerializedFields = new List<SerializedFieldObservation>();
        internal readonly List<ProjectReference> PrefabReferences = new List<ProjectReference>();
        internal readonly List<ScriptableObjectObservation> ScriptableObjects = new List<ScriptableObjectObservation>();
        internal readonly List<string> Tags = new List<string>();
        internal readonly List<LayerObservation> Layers = new List<LayerObservation>();
        internal readonly List<InputActionObservation> InputActions = new List<InputActionObservation>();
        internal readonly List<TestMetadataObservation> Tests = new List<TestMetadataObservation>();
        internal readonly List<CoverageError> Errors = new List<CoverageError>();
        internal readonly HashSet<string> PrefabReferenceKeys = new HashSet<string>(StringComparer.Ordinal);

        private readonly HashSet<string> errorKeys = new HashSet<string>(StringComparer.Ordinal);
        private readonly HashSet<string> truncatedCategories = new HashSet<string>(StringComparer.Ordinal);

        internal bool AddBounded<T>(List<T> target, T value, string category)
        {
            if (target.Count < MaximumObservationsPerCategory)
            {
                target.Add(value);
                return true;
            }

            if (truncatedCategories.Add(category))
            {
                AddError(category, category + "_TRUNCATED");
            }
            return false;
        }

        internal void AddError(string category, string code)
        {
            string key = category + "\n" + code;
            if (errorKeys.Add(key))
            {
                Errors.Add(new CoverageError(category, code));
            }
        }

        internal void AddPrefabReference(string ownerId, string path)
        {
            string key = ownerId + "\n" + path;
            if (PrefabReferenceKeys.Add(key))
            {
                AddBounded(
                    PrefabReferences,
                    new ProjectReference { ownerId = ownerId, path = path },
                    GroundTruthCategories.PrefabReferences);
            }
        }
    }

    internal static class GroundTruthCollector
    {
        private static readonly HashSet<string> TestAttributeNames = new HashSet<string>(StringComparer.Ordinal)
        {
            "NUnit.Framework.TestAttribute",
            "NUnit.Framework.TestCaseAttribute",
            "NUnit.Framework.TestCaseSourceAttribute",
            "UnityEngine.TestTools.UnityTestAttribute"
        };

        internal static GroundTruthManifest Collect(string projectId, DateTime generatedAtUtc)
        {
            GroundTruthCollection collection = new GroundTruthCollection();
            CollectBuildScenes(collection);
            CollectScriptableObjects(collection, new[] { "Assets" });
            CollectTagsAndLayers(InternalEditorUtility.tags, LayerMask.LayerToName, collection);
            CollectInputActions(collection);
            CollectTests(collection);

            GroundTruthManifest manifest = new GroundTruthManifest
            {
                projectId = projectId,
                generatedAt = generatedAtUtc.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                unityVersion = Application.unityVersion
            };
            ApplyDeterministicOrdering(manifest, collection);
            return manifest;
        }

        internal static void CollectBuildScenes(GroundTruthCollection collection)
        {
            string[] configuredScenePaths = EditorBuildSettings.scenes
                .Where(scene => scene.enabled)
                .Select(scene => scene.path)
                .Distinct(StringComparer.Ordinal)
                .OrderBy(path => path, StringComparer.Ordinal)
                .ToArray();

            Scene originalActiveScene = SceneManager.GetActiveScene();
            foreach (string configuredPath in configuredScenePaths)
            {
                string scenePath = NormalizeProjectPath(configuredPath);
                if (scenePath == null)
                {
                    AddSceneInspectionErrors(collection, "SCENE_SOURCE_UNAVAILABLE");
                    continue;
                }
                Scene scene = SceneManager.GetSceneByPath(scenePath);
                bool openedForInspection = false;
                try
                {
                    if (!scene.IsValid() || !scene.isLoaded)
                    {
                        scene = EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Additive);
                        openedForInspection = true;
                    }
                    else if (scene.isDirty)
                    {
                        collection.AddError(GroundTruthCategories.Scenes, "UNSAVED_SCENE_STATE");
                    }

                    CollectScene(scene, scenePath, collection);
                }
                catch
                {
                    AddSceneInspectionErrors(collection, "SCENE_INSPECTION_FAILED");
                }
                finally
                {
                    if (openedForInspection && scene.IsValid() && scene.isLoaded)
                    {
                        EditorSceneManager.CloseScene(scene, true);
                    }
                }
            }

            if (originalActiveScene.IsValid() && originalActiveScene.isLoaded)
            {
                SceneManager.SetActiveScene(originalActiveScene);
            }
        }

        internal static void CollectScene(Scene scene, string scenePath, GroundTruthCollection collection)
        {
            string normalizedPath = NormalizeProjectPath(scenePath);
            if (!scene.IsValid() || !scene.isLoaded || normalizedPath == null)
            {
                AddSceneInspectionErrors(collection, "SCENE_SOURCE_UNAVAILABLE");
                return;
            }

            string sceneId = "scene:" + StableHash(normalizedPath);
            collection.AddBounded(
                collection.Scenes,
                new SceneObservation { id = sceneId, path = normalizedPath },
                GroundTruthCategories.Scenes);

            GameObject[] roots = scene.GetRootGameObjects()
                .OrderBy(root => root.transform.GetSiblingIndex())
                .ThenBy(root => root.name, StringComparer.Ordinal)
                .ToArray();
            foreach (GameObject root in roots)
            {
                CollectGameObject(root, sceneId, collection);
            }
        }

        private static void CollectGameObject(GameObject gameObject, string sceneId, GroundTruthCollection collection)
        {
            string hierarchyPath = BuildHierarchyPath(gameObject.transform);
            string gameObjectId = "gameObject:" + StableHash(sceneId + "|" + hierarchyPath);
            collection.AddBounded(
                collection.GameObjects,
                new GameObjectObservation
                {
                    id = gameObjectId,
                    sceneId = sceneId,
                    hierarchyPath = hierarchyPath
                },
                GroundTruthCategories.GameObjects);

            string prefabPath = NormalizeProjectPath(PrefabUtility.GetPrefabAssetPathOfNearestInstanceRoot(gameObject));
            if (prefabPath != null)
            {
                collection.AddPrefabReference(gameObjectId, prefabPath);
            }

            Component[] components = gameObject.GetComponents<Component>();
            for (int index = 0; index < components.Length; index++)
            {
                CollectComponent(components[index], index, gameObjectId, collection);
            }

            for (int childIndex = 0; childIndex < gameObject.transform.childCount; childIndex++)
            {
                CollectGameObject(gameObject.transform.GetChild(childIndex).gameObject, sceneId, collection);
            }
        }

        private static void CollectComponent(
            Component component,
            int componentIndex,
            string gameObjectId,
            GroundTruthCollection collection)
        {
            if (component == null)
            {
                collection.AddError(GroundTruthCategories.Components, "COMPONENT_TYPE_UNAVAILABLE");
                return;
            }

            Type componentType = component.GetType();
            string typeName = componentType.FullName ?? componentType.Name;
            if (!IsValidText(typeName, 256))
            {
                collection.AddError(GroundTruthCategories.Components, "COMPONENT_TYPE_INVALID");
                return;
            }

            string componentId = "component:" + StableHash(
                gameObjectId + "|" + componentIndex + "|" + typeName);
            string scriptPath = null;
            MonoBehaviour behaviour = component as MonoBehaviour;
            if (behaviour != null)
            {
                MonoScript script = MonoScript.FromMonoBehaviour(behaviour);
                if (script != null)
                {
                    string sourcePath = AssetDatabase.GetAssetPath(script);
                    scriptPath = NormalizeProjectPath(sourcePath);
                    if (!string.IsNullOrEmpty(sourcePath) && scriptPath == null)
                    {
                        collection.AddError(GroundTruthCategories.Components, "SCRIPT_PATH_INVALID");
                    }
                }
            }

            collection.AddBounded(
                collection.Components,
                new ComponentObservation
                {
                    id = componentId,
                    gameObjectId = gameObjectId,
                    typeName = typeName,
                    scriptPath = scriptPath
                },
                GroundTruthCategories.Components);

            CollectSerializedFields(component, componentId, collection);
        }

        private static void CollectSerializedFields(
            Component component,
            string componentId,
            GroundTruthCollection collection)
        {
            try
            {
                SerializedObject serializedObject = new SerializedObject(component);
                SerializedProperty property = serializedObject.GetIterator();
                bool enterChildren = true;
                while (property.NextVisible(enterChildren))
                {
                    enterChildren = false;
                    if (property.depth != 0)
                    {
                        continue;
                    }

                    string fieldName = property.propertyPath;
                    string fieldType = property.type;
                    if (!IsValidText(fieldName, 256) || !IsValidText(fieldType, 256))
                    {
                        collection.AddError(GroundTruthCategories.SerializedFields, "SERIALIZED_FIELD_METADATA_INVALID");
                        continue;
                    }

                    ProjectReference reference = null;
                    if (property.propertyType == SerializedPropertyType.ObjectReference)
                    {
                        UnityEngine.Object referencedObject = property.objectReferenceValue;
                        string referencePath = referencedObject == null
                            ? null
                            : NormalizeProjectPath(AssetDatabase.GetAssetPath(referencedObject));
                        if (referencePath != null)
                        {
                            reference = new ProjectReference { ownerId = componentId, path = referencePath };
                            if (referencePath.EndsWith(".prefab", StringComparison.OrdinalIgnoreCase))
                            {
                                collection.AddPrefabReference(componentId, referencePath);
                            }
                        }
                    }

                    collection.AddBounded(
                        collection.SerializedFields,
                        new SerializedFieldObservation
                        {
                            componentId = componentId,
                            name = fieldName,
                            typeName = fieldType,
                            reference = reference
                        },
                        GroundTruthCategories.SerializedFields);
                }
            }
            catch
            {
                collection.AddError(GroundTruthCategories.SerializedFields, "SERIALIZED_OBJECT_UNAVAILABLE");
            }
        }

        internal static void CollectScriptableObjects(
            GroundTruthCollection collection,
            string[] searchFolders)
        {
            try
            {
                string[] paths = AssetDatabase.FindAssets("t:ScriptableObject", searchFolders)
                    .Select(AssetDatabase.GUIDToAssetPath)
                    .Select(NormalizeProjectPath)
                    .Where(path => path != null)
                    .Distinct(StringComparer.Ordinal)
                    .OrderBy(path => path, StringComparer.Ordinal)
                    .ToArray();

                foreach (string path in paths)
                {
                    UnityEngine.Object[] assets;
                    try
                    {
                        assets = AssetDatabase.LoadAllAssetsAtPath(path);
                    }
                    catch
                    {
                        collection.AddError(GroundTruthCategories.ScriptableObjects, "SCRIPTABLE_OBJECT_LOAD_FAILED");
                        continue;
                    }

                    ScriptableObject[] scriptableObjects = assets
                        .OfType<ScriptableObject>()
                        .OrderBy(asset => asset.GetType().FullName ?? asset.GetType().Name, StringComparer.Ordinal)
                        .ThenBy(asset => asset.name, StringComparer.Ordinal)
                        .ToArray();
                    foreach (ScriptableObject asset in scriptableObjects)
                    {
                        string typeName = asset.GetType().FullName ?? asset.GetType().Name;
                        if (!IsValidText(typeName, 256))
                        {
                            collection.AddError(GroundTruthCategories.ScriptableObjects, "SCRIPTABLE_OBJECT_TYPE_INVALID");
                            continue;
                        }

                        string guid;
                        long localId;
                        if (!AssetDatabase.TryGetGUIDAndLocalFileIdentifier(asset, out guid, out localId) ||
                            string.IsNullOrEmpty(guid))
                        {
                            guid = StableHash(path);
                            localId = Array.IndexOf(scriptableObjects, asset);
                        }
                        collection.AddBounded(
                            collection.ScriptableObjects,
                            new ScriptableObjectObservation
                            {
                                id = "asset:" + guid + ":" + localId,
                                path = path,
                                typeName = typeName
                            },
                            GroundTruthCategories.ScriptableObjects);
                    }
                }
            }
            catch
            {
                collection.AddError(GroundTruthCategories.ScriptableObjects, "SCRIPTABLE_OBJECT_DISCOVERY_FAILED");
            }
        }

        internal static void CollectTagsAndLayers(
            IEnumerable<string> sourceTags,
            Func<int, string> layerNameAt,
            GroundTruthCollection collection)
        {
            try
            {
                string[] tags = sourceTags.ToArray();
                if (tags.Any(tag => !IsValidText(tag, 256)))
                {
                    collection.AddError(GroundTruthCategories.TagsLayers, "TAG_METADATA_INVALID");
                }
                foreach (string tag in tags
                    .Where(tag => IsValidText(tag, 256))
                    .Distinct(StringComparer.Ordinal)
                    .OrderBy(tag => tag, StringComparer.Ordinal))
                {
                    collection.AddBounded(collection.Tags, tag, GroundTruthCategories.TagsLayers);
                }

                for (int index = 0; index < 32; index++)
                {
                    string layerName = layerNameAt(index);
                    if (string.IsNullOrWhiteSpace(layerName))
                    {
                        continue;
                    }
                    if (!IsValidText(layerName, 256))
                    {
                        collection.AddError(GroundTruthCategories.TagsLayers, "LAYER_METADATA_INVALID");
                        continue;
                    }
                    collection.AddBounded(
                        collection.Layers,
                        new LayerObservation { index = index, name = layerName },
                        GroundTruthCategories.TagsLayers);
                }
            }
            catch
            {
                collection.AddError(GroundTruthCategories.TagsLayers, "TAGS_LAYERS_UNAVAILABLE");
            }
        }

        internal static void CollectInputActions(GroundTruthCollection collection)
        {
            Type inputActionAssetType = Type.GetType("UnityEngine.InputSystem.InputActionAsset, Unity.InputSystem");
            if (inputActionAssetType == null)
            {
                return;
            }

            try
            {
                string[] paths = AssetDatabase.FindAssets("t:InputActionAsset", new[] { "Assets" })
                    .Select(AssetDatabase.GUIDToAssetPath)
                    .Select(NormalizeProjectPath)
                    .Where(path => path != null)
                    .Distinct(StringComparer.Ordinal)
                    .OrderBy(path => path, StringComparer.Ordinal)
                    .ToArray();

                PropertyInfo mapsProperty = inputActionAssetType.GetProperty("actionMaps", BindingFlags.Instance | BindingFlags.Public);
                if (mapsProperty == null)
                {
                    collection.AddError(GroundTruthCategories.InputActions, "INPUT_ACTION_API_UNAVAILABLE");
                    return;
                }

                foreach (string path in paths)
                {
                    UnityEngine.Object asset = AssetDatabase.LoadAssetAtPath(path, inputActionAssetType);
                    if (asset == null)
                    {
                        collection.AddError(GroundTruthCategories.InputActions, "INPUT_ACTION_ASSET_UNAVAILABLE");
                        continue;
                    }

                    IEnumerable maps = mapsProperty.GetValue(asset, null) as IEnumerable;
                    if (maps == null)
                    {
                        collection.AddError(GroundTruthCategories.InputActions, "INPUT_ACTION_API_UNAVAILABLE");
                        continue;
                    }

                    foreach (object map in maps)
                    {
                        Type mapType = map.GetType();
                        PropertyInfo mapNameProperty = mapType.GetProperty("name", BindingFlags.Instance | BindingFlags.Public);
                        PropertyInfo actionsProperty = mapType.GetProperty("actions", BindingFlags.Instance | BindingFlags.Public);
                        string mapName = mapNameProperty == null ? null : mapNameProperty.GetValue(map, null) as string;
                        IEnumerable actions = actionsProperty == null ? null : actionsProperty.GetValue(map, null) as IEnumerable;
                        if (!IsValidText(mapName, 256) || actions == null)
                        {
                            collection.AddError(GroundTruthCategories.InputActions, "INPUT_ACTION_METADATA_INVALID");
                            continue;
                        }

                        foreach (object action in actions)
                        {
                            PropertyInfo actionNameProperty = action.GetType().GetProperty("name", BindingFlags.Instance | BindingFlags.Public);
                            string actionName = actionNameProperty == null ? null : actionNameProperty.GetValue(action, null) as string;
                            if (!IsValidText(actionName, 256))
                            {
                                collection.AddError(GroundTruthCategories.InputActions, "INPUT_ACTION_METADATA_INVALID");
                                continue;
                            }
                            collection.AddBounded(
                                collection.InputActions,
                                new InputActionObservation
                                {
                                    assetPath = path,
                                    mapName = mapName,
                                    actionName = actionName
                                },
                                GroundTruthCategories.InputActions);
                        }
                    }
                }
            }
            catch
            {
                collection.AddError(GroundTruthCategories.InputActions, "INPUT_ACTION_DISCOVERY_FAILED");
            }
        }

        internal static void CollectTests(GroundTruthCollection collection)
        {
            try
            {
                Dictionary<string, System.Reflection.Assembly> loadedAssemblies = AppDomain.CurrentDomain
                    .GetAssemblies()
                    .Where(assembly => !assembly.IsDynamic)
                    .GroupBy(assembly => assembly.GetName().Name, StringComparer.Ordinal)
                    .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);

                foreach (UnityEditor.Compilation.Assembly compiledAssembly in CompilationPipeline.GetAssemblies()
                    .OrderBy(assembly => assembly.name, StringComparer.Ordinal))
                {
                    System.Reflection.Assembly loadedAssembly;
                    if (!loadedAssemblies.TryGetValue(compiledAssembly.name, out loadedAssembly))
                    {
                        continue;
                    }

                    int testCount;
                    try
                    {
                        testCount = CountTestCases(loadedAssembly);
                    }
                    catch
                    {
                        collection.AddError(GroundTruthCategories.Tests, "TEST_METADATA_UNAVAILABLE");
                        continue;
                    }
                    if (testCount == 0)
                    {
                        continue;
                    }

                    if (!IsValidText(compiledAssembly.name, 256))
                    {
                        collection.AddError(GroundTruthCategories.Tests, "TEST_ASSEMBLY_METADATA_INVALID");
                        continue;
                    }

                    string platform = (compiledAssembly.flags & AssemblyFlags.EditorAssembly) != 0
                        ? "EDIT_MODE"
                        : "PLAY_MODE";
                    collection.AddBounded(
                        collection.Tests,
                        new TestMetadataObservation
                        {
                            assemblyName = compiledAssembly.name,
                            platform = platform,
                            testCount = testCount
                        },
                        GroundTruthCategories.Tests);
                }
            }
            catch
            {
                collection.AddError(GroundTruthCategories.Tests, "TEST_DISCOVERY_FAILED");
            }
        }

        internal static int CountTestCases(System.Reflection.Assembly assembly)
        {
            Type[] types;
            try
            {
                types = assembly.GetTypes();
            }
            catch (ReflectionTypeLoadException error)
            {
                types = error.Types.Where(type => type != null).ToArray();
            }

            int count = 0;
            foreach (Type type in types.OrderBy(type => type.FullName, StringComparer.Ordinal))
            {
                foreach (MethodInfo method in type.GetMethods(
                    BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic))
                {
                    IList<CustomAttributeData> attributes = CustomAttributeData.GetCustomAttributes(method);
                    int caseCount = attributes.Count(attribute =>
                        attribute.AttributeType.FullName == "NUnit.Framework.TestCaseAttribute");
                    if (caseCount > 0)
                    {
                        count += caseCount;
                        continue;
                    }
                    if (attributes.Any(attribute => TestAttributeNames.Contains(attribute.AttributeType.FullName)))
                    {
                        count++;
                    }
                }
            }
            return count;
        }

        internal static void ApplyDeterministicOrdering(
            GroundTruthManifest manifest,
            GroundTruthCollection collection)
        {
            manifest.coverage.categories = GroundTruthCategories.All.ToArray();
            manifest.coverage.errors = collection.Errors
                .OrderBy(error => Array.IndexOf(GroundTruthCategories.All, error.category))
                .ThenBy(error => error.code, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.scenes = collection.Scenes
                .OrderBy(item => item.path, StringComparer.Ordinal)
                .ThenBy(item => item.id, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.gameObjects = collection.GameObjects
                .OrderBy(item => item.sceneId, StringComparer.Ordinal)
                .ThenBy(item => item.hierarchyPath, StringComparer.Ordinal)
                .ThenBy(item => item.id, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.components = collection.Components
                .OrderBy(item => item.gameObjectId, StringComparer.Ordinal)
                .ThenBy(item => item.id, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.serializedFields = collection.SerializedFields
                .OrderBy(item => item.componentId, StringComparer.Ordinal)
                .ThenBy(item => item.name, StringComparer.Ordinal)
                .ThenBy(item => item.typeName, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.prefabReferences = collection.PrefabReferences
                .OrderBy(item => item.ownerId, StringComparer.Ordinal)
                .ThenBy(item => item.path, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.scriptableObjects = collection.ScriptableObjects
                .OrderBy(item => item.path, StringComparer.Ordinal)
                .ThenBy(item => item.id, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.tags = collection.Tags
                .OrderBy(item => item, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.layers = collection.Layers
                .OrderBy(item => item.index)
                .ThenBy(item => item.name, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.inputActions = collection.InputActions
                .OrderBy(item => item.assetPath, StringComparer.Ordinal)
                .ThenBy(item => item.mapName, StringComparer.Ordinal)
                .ThenBy(item => item.actionName, StringComparer.Ordinal)
                .ToArray();
            manifest.observations.tests = collection.Tests
                .OrderBy(item => item.assemblyName, StringComparer.Ordinal)
                .ThenBy(item => item.platform, StringComparer.Ordinal)
                .ToArray();
        }

        internal static string NormalizeProjectPath(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                return null;
            }

            string normalized = path.Replace('\\', '/');
            if (normalized.Length > 512 || normalized.StartsWith("/", StringComparison.Ordinal) ||
                normalized.Contains(":") || normalized.Any(char.IsControl))
            {
                return null;
            }
            string[] segments = normalized.Split('/');
            if (segments.Length < 2 ||
                (segments[0] != "Assets" && segments[0] != "Packages") ||
                segments.Any(segment => string.IsNullOrEmpty(segment) || segment == "." || segment == ".."))
            {
                return null;
            }
            return normalized;
        }

        internal static string BuildHierarchyPath(Transform transform)
        {
            List<string> segments = new List<string>();
            Transform current = transform;
            while (current != null)
            {
                string escapedName = Uri.EscapeDataString(string.IsNullOrEmpty(current.name) ? "_" : current.name);
                segments.Add(escapedName + "[" + current.GetSiblingIndex() + "]");
                current = current.parent;
            }
            segments.Reverse();
            string path = string.Join("/", segments);
            if (path.Length <= 512)
            {
                return path;
            }
            return path.Substring(0, 447) + "~" + StableHash(path);
        }

        internal static string StableHash(string value)
        {
            using (SHA256 hash = SHA256.Create())
            {
                byte[] bytes = hash.ComputeHash(Encoding.UTF8.GetBytes(value));
                StringBuilder builder = new StringBuilder(64);
                foreach (byte item in bytes)
                {
                    builder.Append(item.ToString("x2"));
                }
                return builder.ToString();
            }
        }

        private static bool IsValidText(string value, int maximumLength)
        {
            return !string.IsNullOrWhiteSpace(value) &&
                   value == value.Trim() &&
                   value.Length <= maximumLength &&
                   !value.Any(char.IsControl);
        }

        private static void AddSceneInspectionErrors(GroundTruthCollection collection, string code)
        {
            collection.AddError(GroundTruthCategories.Scenes, code);
            collection.AddError(GroundTruthCategories.GameObjects, code);
            collection.AddError(GroundTruthCategories.Components, code);
            collection.AddError(GroundTruthCategories.SerializedFields, code);
            collection.AddError(GroundTruthCategories.PrefabReferences, code);
        }
    }
}
