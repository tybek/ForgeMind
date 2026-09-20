using System;
using System.Globalization;
using System.IO;
using System.Text;
using UnityEditor;
using UnityEngine;

namespace ForgeMind.UnityGroundTruth
{
    internal sealed class GroundTruthExportException : Exception
    {
        internal GroundTruthExportException(string safeMessage) : base(safeMessage)
        {
        }
    }

    internal static class GroundTruthExporter
    {
        internal const string ToolVersion = "0.2.0";
        internal const string ManifestRelativePath = ".forgemind/unity-groundtruth.json";
        private const string ProjectMetadataRelativePath = ".forgemind/project.json";

        [MenuItem("Tools/ForgeMind/Export GroundTruth", false, 2000)]
        private static void ExportFromMenu()
        {
            try
            {
                ExportCounts counts = Export();
                string summary = string.Format(
                    CultureInfo.InvariantCulture,
                    "Manifest written to {0}.\n\nScenes: {1}\nGameObjects: {2}\nComponents: {3}\nScriptableObjects: {4}",
                    ManifestRelativePath,
                    counts.Scenes,
                    counts.GameObjects,
                    counts.Components,
                    counts.ScriptableObjects);
                Debug.Log("[ForgeMind] GroundTruth manifest written. " +
                          "Scenes: " + counts.Scenes + ", GameObjects: " + counts.GameObjects +
                          ", Components: " + counts.Components + ", ScriptableObjects: " + counts.ScriptableObjects + ".");
                EditorUtility.DisplayDialog("ForgeMind GroundTruth", summary, "OK");
            }
            catch (GroundTruthExportException error)
            {
                Debug.LogError("[ForgeMind] GroundTruth export failed. " + error.Message);
                EditorUtility.DisplayDialog("ForgeMind GroundTruth export failed", error.Message, "OK");
            }
            catch
            {
                const string message = "The GroundTruth export failed safely. Check that the Unity project is initialized in ForgeMind and that .forgemind/unity-groundtruth.json is writable.";
                Debug.LogError("[ForgeMind] " + message);
                EditorUtility.DisplayDialog("ForgeMind GroundTruth export failed", message, "OK");
            }
        }

        internal static ExportCounts Export()
        {
            string projectRoot = ProjectRoot();
            ForgeMindProjectMetadata project = ReadProjectMetadata(
                Path.Combine(projectRoot, ProjectMetadataRelativePath.Replace('/', Path.DirectorySeparatorChar)));
            GroundTruthManifest manifest = GroundTruthCollector.Collect(project.projectId, DateTime.UtcNow);
            string json = SerializeManifest(manifest);
            string manifestPath = Path.Combine(projectRoot, ManifestRelativePath.Replace('/', Path.DirectorySeparatorChar));
            WriteManifestSafely(manifestPath, json);

            return new ExportCounts
            {
                Scenes = manifest.observations.scenes.Length,
                GameObjects = manifest.observations.gameObjects.Length,
                Components = manifest.observations.components.Length,
                ScriptableObjects = manifest.observations.scriptableObjects.Length
            };
        }

        internal static string ProjectRoot()
        {
            string assetsPath = Application.dataPath;
            if (string.IsNullOrWhiteSpace(assetsPath))
            {
                throw new GroundTruthExportException("Unity did not provide a valid project path.");
            }
            DirectoryInfo assetsDirectory = new DirectoryInfo(assetsPath);
            if (assetsDirectory.Parent == null)
            {
                throw new GroundTruthExportException("Unity did not provide a valid project root.");
            }
            return assetsDirectory.Parent.FullName;
        }

        internal static ForgeMindProjectMetadata ReadProjectMetadata(string path)
        {
            string json;
            try
            {
                json = File.ReadAllText(path, Encoding.UTF8);
            }
            catch
            {
                throw new GroundTruthExportException(
                    "ForgeMind project metadata is missing or unreadable. Initialize this Unity project in ForgeMind before exporting.");
            }

            ForgeMindProjectMetadata project;
            try
            {
                project = JsonUtility.FromJson<ForgeMindProjectMetadata>(json);
            }
            catch
            {
                throw new GroundTruthExportException(
                    "ForgeMind project metadata is malformed. Open the project in ForgeMind and repair it before exporting.");
            }

            Guid projectId;
            DateTimeOffset createdAt;
            if (project == null ||
                project.formatVersion != 1 ||
                !Guid.TryParse(project.projectId, out projectId) ||
                string.IsNullOrWhiteSpace(project.name) ||
                !DateTimeOffset.TryParse(
                    project.createdAt,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind,
                    out createdAt))
            {
                throw new GroundTruthExportException(
                    "ForgeMind project metadata is invalid or unsupported. Open the project in ForgeMind before exporting.");
            }

            return project;
        }

        internal static string SerializeManifest(GroundTruthManifest manifest)
        {
            string json;
            try
            {
                json = ManifestJson.Serialize(manifest);
            }
            catch
            {
                throw new GroundTruthExportException("Unity could not serialize the GroundTruth manifest.");
            }

            GroundTruthManifest roundTrip;
            try
            {
                roundTrip = JsonUtility.FromJson<GroundTruthManifest>(json);
            }
            catch
            {
                throw new GroundTruthExportException("Unity produced an invalid GroundTruth manifest.");
            }
            if (roundTrip == null ||
                roundTrip.formatVersion != 1 ||
                roundTrip.projectId != manifest.projectId ||
                roundTrip.coverage == null ||
                roundTrip.coverage.categories == null ||
                roundTrip.coverage.errors == null ||
                roundTrip.observations == null ||
                roundTrip.observations.scenes == null ||
                roundTrip.observations.gameObjects == null ||
                roundTrip.observations.components == null ||
                roundTrip.observations.serializedFields == null ||
                roundTrip.observations.prefabReferences == null ||
                roundTrip.observations.scriptableObjects == null ||
                roundTrip.observations.tags == null ||
                roundTrip.observations.layers == null ||
                roundTrip.observations.inputActions == null ||
                roundTrip.observations.tests == null)
            {
                throw new GroundTruthExportException("Unity produced an incomplete GroundTruth manifest.");
            }
            return json;
        }

        internal static void WriteManifestSafely(string path, string contents)
        {
            byte[] previousContents = null;
            bool previousManifestExists = File.Exists(path);
            if (previousManifestExists)
            {
                try
                {
                    previousContents = File.ReadAllBytes(path);
                }
                catch
                {
                    throw new GroundTruthExportException(
                        "The existing GroundTruth manifest is unreadable and was not replaced.");
                }
            }

            try
            {
                File.WriteAllText(path, contents, new UTF8Encoding(false));
            }
            catch
            {
                RestoreOrRemoveIncompleteManifest(path, previousManifestExists, previousContents);
                throw new GroundTruthExportException(
                    "ForgeMind could not write .forgemind/unity-groundtruth.json. Check project permissions and try again.");
            }
        }

        private static void RestoreOrRemoveIncompleteManifest(
            string path,
            bool previousManifestExists,
            byte[] previousContents)
        {
            try
            {
                if (previousManifestExists && previousContents != null)
                {
                    File.WriteAllBytes(path, previousContents);
                }
                else if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch
            {
                try
                {
                    if (File.Exists(path))
                    {
                        File.Delete(path);
                    }
                }
                catch
                {
                    // No additional path or exception detail is surfaced from recovery.
                }
            }
        }
    }
}
