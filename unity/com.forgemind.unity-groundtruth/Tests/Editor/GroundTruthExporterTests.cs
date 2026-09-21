using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace ForgeMind.UnityGroundTruth.Tests
{
    public sealed class GroundTruthExporterTests
    {
        private const string TestAssetFolder = "Assets/__ForgeMindGroundTruthTests";

        [SetUp]
        public void SetUp()
        {
            AssetDatabase.DeleteAsset(TestAssetFolder);
        }

        [TearDown]
        public void TearDown()
        {
            AssetDatabase.DeleteAsset(TestAssetFolder);
        }

        [Test]
        public void DeterministicOrderingProducesStableJson()
        {
            GroundTruthCollection collection = new GroundTruthCollection();
            collection.Scenes.Add(new SceneObservation { id = "scene:b", path = "Assets/Z.unity" });
            collection.Scenes.Add(new SceneObservation { id = "scene:a", path = "Assets/A.unity" });
            collection.Tags.AddRange(new[] { "Zulu", "Alpha" });
            collection.Errors.Add(new CoverageError(GroundTruthCategories.Tests, "TEST_DISCOVERY_FAILED"));
            collection.Errors.Add(new CoverageError(GroundTruthCategories.Scenes, "SCENE_INSPECTION_FAILED"));

            GroundTruthManifest first = Manifest("project-id");
            GroundTruthCollector.ApplyDeterministicOrdering(first, collection);
            GroundTruthManifest second = Manifest("project-id");
            GroundTruthCollector.ApplyDeterministicOrdering(second, collection);

            Assert.That(first.observations.scenes.Select(item => item.path),
                Is.EqualTo(new[] { "Assets/A.unity", "Assets/Z.unity" }));
            Assert.That(first.observations.tags, Is.EqualTo(new[] { "Alpha", "Zulu" }));
            Assert.That(ManifestJson.Serialize(first), Is.EqualTo(ManifestJson.Serialize(second)));
        }

        [TestCase("Assets/Scenes/Main.unity", "Assets/Scenes/Main.unity")]
        [TestCase("Assets\\Scenes\\Main.unity", "Assets/Scenes/Main.unity")]
        [TestCase("Packages/com.example.tool/Editor/Tool.cs", "Packages/com.example.tool/Editor/Tool.cs")]
        [TestCase("C:\\Project\\Assets\\Main.unity", null)]
        [TestCase("../Assets/Main.unity", null)]
        [TestCase("Assets/../Secret.asset", null)]
        public void ProjectPathsAreNormalizedAndNeverAbsolute(string source, string expected)
        {
            Assert.That(GroundTruthCollector.NormalizeProjectPath(source), Is.EqualTo(expected));
        }

        [Test]
        public void SceneHierarchyAndComponentMetadataComeFromLoadedScene()
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            try
            {
                GameObject root = new GameObject("Root");
                SceneManager.MoveGameObjectToScene(root, scene);
                GameObject child = new GameObject("Child/With Slash");
                child.transform.SetParent(root.transform);
                child.AddComponent<GroundTruthTestBehaviour>();

                GroundTruthCollection collection = new GroundTruthCollection();
                GroundTruthCollector.CollectScene(scene, "Assets/Scenes/Extraction.unity", collection);

                Assert.That(collection.Scenes.Single().path, Is.EqualTo("Assets/Scenes/Extraction.unity"));
                Assert.That(collection.GameObjects.Count, Is.EqualTo(2));
                Assert.That(collection.GameObjects.Any(item => item.hierarchyPath.Contains("Child%2FWith%20Slash")), Is.True);
                ComponentObservation behaviour = collection.Components.FirstOrDefault(item =>
                    item.typeName == typeof(GroundTruthTestBehaviour).FullName);
                Assert.That(
                    behaviour,
                    Is.Not.Null,
                    "Collected component types: " + string.Join(", ", collection.Components.Select(item => item.typeName)) +
                    "; errors: " + string.Join(", ", collection.Errors.Select(item => item.code)));
                Assert.That(behaviour.scriptPath, Does.StartWith("Packages/"));
                Assert.That(collection.SerializedFields.Any(item =>
                    item.componentId == behaviour.id && item.name == "speed"), Is.True);
            }
            finally
            {
                EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            }
        }

        [Test]
        public void ScriptableObjectMetadataUsesPortableAssetIdentity()
        {
            Directory.CreateDirectory(TestAssetFolder);
            GroundTruthTestSettings settings = ScriptableObject.CreateInstance<GroundTruthTestSettings>();
            string assetPath = TestAssetFolder + "/Settings.asset";
            AssetDatabase.CreateAsset(settings, assetPath);
            AssetDatabase.SaveAssets();

            GroundTruthCollection collection = new GroundTruthCollection();
            GroundTruthCollector.CollectScriptableObjects(collection, new[] { TestAssetFolder });

            ScriptableObjectObservation observation = collection.ScriptableObjects.Single();
            Assert.That(observation.path, Is.EqualTo(assetPath));
            Assert.That(observation.id, Does.StartWith("asset:"));
            Assert.That(observation.typeName, Is.EqualTo(typeof(GroundTruthTestSettings).FullName));
        }

        [Test]
        public void TagsAndLayersAreSortedAndRetainLayerIndexes()
        {
            GroundTruthCollection collection = new GroundTruthCollection();
            GroundTruthCollector.CollectTagsAndLayers(
                new[] { "Player", "EditorOnly", "Player" },
                index => index == 0 ? "Default" : index == 8 ? "Gameplay" : string.Empty,
                collection);

            GroundTruthManifest manifest = Manifest("project-id");
            GroundTruthCollector.ApplyDeterministicOrdering(manifest, collection);
            Assert.That(manifest.observations.tags, Is.EqualTo(new[] { "EditorOnly", "Player" }));
            Assert.That(manifest.observations.layers.Select(layer => layer.index), Is.EqualTo(new[] { 0, 8 }));
            Assert.That(manifest.observations.layers[1].name, Is.EqualTo("Gameplay"));
        }

        [Test]
        public void MalformedAndUnsupportedProjectMetadataFailsBeforeExport()
        {
            string path = Path.GetTempFileName();
            try
            {
                File.WriteAllText(path, "{not-json");
                Assert.That(
                    () => GroundTruthExporter.ReadProjectMetadata(path),
                    Throws.TypeOf<GroundTruthExportException>());

                File.WriteAllText(path,
                    "{\"formatVersion\":2,\"projectId\":\"550e8400-e29b-41d4-a716-446655440000\",\"name\":\"Test\",\"createdAt\":\"2026-09-20T12:00:00Z\"}");
                Assert.That(
                    () => GroundTruthExporter.ReadProjectMetadata(path),
                    Throws.TypeOf<GroundTruthExportException>());
            }
            finally
            {
                File.Delete(path);
            }
        }

        [Test]
        public void SerializationOmitsUnavailableOptionalMetadataAndKeepsAllArrays()
        {
            GroundTruthCollection collection = new GroundTruthCollection();
            collection.Components.Add(new ComponentObservation
            {
                id = "component:1",
                gameObjectId = "gameObject:1",
                typeName = "UnityEngine.Transform"
            });
            collection.SerializedFields.Add(new SerializedFieldObservation
            {
                componentId = "component:1",
                name = "m_LocalPosition",
                typeName = "Vector3"
            });
            GroundTruthManifest manifest = Manifest("550e8400-e29b-41d4-a716-446655440000");
            GroundTruthCollector.ApplyDeterministicOrdering(manifest, collection);

            string json = GroundTruthExporter.SerializeManifest(manifest);
            Assert.That(json, Does.Not.Contain("scriptPath"));
            Assert.That(json, Does.Not.Contain("reference"));
            Assert.That(json, Does.Contain("\"inputActions\": []"));
            Assert.That(json, Does.Contain("\"tests\": []"));
            Assert.That(JsonUtility.FromJson<GroundTruthManifest>(json), Is.Not.Null);
        }

        [Test]
        public void BoundedCollectionRecordsOneExplicitTruncationIssue()
        {
            GroundTruthCollection collection = new GroundTruthCollection();
            for (int index = 0; index <= GroundTruthCollection.MaximumObservationsPerCategory; index++)
            {
                collection.AddBounded(
                    collection.SerializedFields,
                    new SerializedFieldObservation
                    {
                        componentId = "component:1",
                        name = "field" + index,
                        typeName = "int"
                    },
                    GroundTruthCategories.SerializedFields);
            }

            collection.AddBounded(
                collection.SerializedFields,
                new SerializedFieldObservation
                {
                    componentId = "component:1",
                    name = "another-field",
                    typeName = "int"
                },
                GroundTruthCategories.SerializedFields);

            Assert.That(collection.SerializedFields.Count,
                Is.EqualTo(GroundTruthCollection.MaximumObservationsPerCategory));
            Assert.That(collection.Errors.Count, Is.EqualTo(1));
            Assert.That(collection.Errors[0].category, Is.EqualTo(GroundTruthCategories.SerializedFields));
            Assert.That(collection.Errors[0].code, Is.EqualTo("SERIALIZED_FIELDS_TRUNCATED"));
        }

        private static GroundTruthManifest Manifest(string projectId)
        {
            return new GroundTruthManifest
            {
                projectId = projectId,
                generatedAt = "2026-09-20T12:00:00Z",
                unityVersion = "6000.3.23f1"
            };
        }
    }
}
