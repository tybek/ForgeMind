using System;
using System.Globalization;
using System.Text;

namespace ForgeMind.UnityGroundTruth
{
    internal static class ManifestJson
    {
        internal static string Serialize(GroundTruthManifest manifest)
        {
            StringBuilder json = new StringBuilder(4096);
            json.Append("{\n");
            Property(json, 1, "formatVersion", manifest.formatVersion.ToString(CultureInfo.InvariantCulture), false);
            Property(json, 1, "projectId", Quote(manifest.projectId), false);
            Property(json, 1, "generatedAt", Quote(manifest.generatedAt), false);
            Property(json, 1, "unityVersion", Quote(manifest.unityVersion), false);
            Indent(json, 1).Append("\"source\": {\n");
            Property(json, 2, "kind", Quote(manifest.source.kind), false);
            Property(json, 2, "toolVersion", Quote(manifest.source.toolVersion), true);
            Indent(json, 1).Append("},\n");
            Indent(json, 1).Append("\"coverage\": {\n");
            Indent(json, 2).Append("\"categories\": ");
            StringArray(json, manifest.coverage.categories, 2);
            json.Append(",\n");
            Indent(json, 2).Append("\"errors\": ");
            Array(json, manifest.coverage.errors, 2, (builder, error, indent) =>
            {
                builder.Append("{\n");
                Property(builder, indent + 1, "category", Quote(error.category), false);
                Property(builder, indent + 1, "code", Quote(error.code), true);
                Indent(builder, indent).Append('}');
            });
            json.Append('\n');
            Indent(json, 1).Append("},\n");
            Indent(json, 1).Append("\"observations\": {\n");

            ObservationArray(json, "scenes", manifest.observations.scenes, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "id", Quote(item.id), false);
                Property(builder, indent, "path", Quote(item.path), true);
            }, false);
            ObservationArray(json, "gameObjects", manifest.observations.gameObjects, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "id", Quote(item.id), false);
                Property(builder, indent, "sceneId", Quote(item.sceneId), false);
                Property(builder, indent, "hierarchyPath", Quote(item.hierarchyPath), true);
            }, false);
            ObservationArray(json, "components", manifest.observations.components, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "id", Quote(item.id), false);
                Property(builder, indent, "gameObjectId", Quote(item.gameObjectId), false);
                Property(builder, indent, "typeName", Quote(item.typeName), item.scriptPath == null);
                if (item.scriptPath != null)
                {
                    Property(builder, indent, "scriptPath", Quote(item.scriptPath), true);
                }
            }, false);
            ObservationArray(json, "serializedFields", manifest.observations.serializedFields, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "componentId", Quote(item.componentId), false);
                Property(builder, indent, "name", Quote(item.name), false);
                Property(builder, indent, "typeName", Quote(item.typeName), item.reference == null);
                if (item.reference != null)
                {
                    Indent(builder, indent).Append("\"reference\": {\n");
                    Property(builder, indent + 1, "ownerId", Quote(item.reference.ownerId), false);
                    Property(builder, indent + 1, "path", Quote(item.reference.path), true);
                    Indent(builder, indent).Append("}\n");
                }
            }, false);
            ObservationArray(json, "prefabReferences", manifest.observations.prefabReferences, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "ownerId", Quote(item.ownerId), false);
                Property(builder, indent, "path", Quote(item.path), true);
            }, false);
            ObservationArray(json, "scriptableObjects", manifest.observations.scriptableObjects, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "id", Quote(item.id), false);
                Property(builder, indent, "path", Quote(item.path), false);
                Property(builder, indent, "typeName", Quote(item.typeName), true);
            }, false);
            Indent(json, 2).Append("\"tags\": ");
            StringArray(json, manifest.observations.tags, 2);
            json.Append(",\n");
            ObservationArray(json, "layers", manifest.observations.layers, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "index", item.index.ToString(CultureInfo.InvariantCulture), false);
                Property(builder, indent, "name", Quote(item.name), true);
            }, false);
            ObservationArray(json, "inputActions", manifest.observations.inputActions, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "assetPath", Quote(item.assetPath), false);
                Property(builder, indent, "mapName", Quote(item.mapName), false);
                Property(builder, indent, "actionName", Quote(item.actionName), true);
            }, false);
            ObservationArray(json, "tests", manifest.observations.tests, 2, (builder, item, indent) =>
            {
                Property(builder, indent, "assemblyName", Quote(item.assemblyName), false);
                Property(builder, indent, "platform", Quote(item.platform), false);
                Property(builder, indent, "testCount", item.testCount.ToString(CultureInfo.InvariantCulture), true);
            }, true);

            Indent(json, 1).Append("}\n");
            json.Append("}\n");
            return json.ToString();
        }

        private static void ObservationArray<T>(
            StringBuilder json,
            string name,
            T[] values,
            int indent,
            Action<StringBuilder, T, int> writeProperties,
            bool last)
        {
            Indent(json, indent).Append(Quote(name)).Append(": ");
            Array(json, values, indent, (builder, value, itemIndent) =>
            {
                builder.Append("{\n");
                writeProperties(builder, value, itemIndent + 1);
                Indent(builder, itemIndent).Append('}');
            });
            json.Append(last ? "\n" : ",\n");
        }

        private static void StringArray(StringBuilder json, string[] values, int indent)
        {
            Array(json, values, indent, (builder, value, unused) => builder.Append(Quote(value)));
        }

        private static void Array<T>(
            StringBuilder json,
            T[] values,
            int indent,
            Action<StringBuilder, T, int> writeValue)
        {
            if (values.Length == 0)
            {
                json.Append("[]");
                return;
            }
            json.Append("[\n");
            for (int index = 0; index < values.Length; index++)
            {
                Indent(json, indent + 1);
                writeValue(json, values[index], indent + 1);
                json.Append(index + 1 == values.Length ? "\n" : ",\n");
            }
            Indent(json, indent).Append(']');
        }

        private static void Property(
            StringBuilder json,
            int indent,
            string name,
            string serializedValue,
            bool last)
        {
            Indent(json, indent)
                .Append(Quote(name))
                .Append(": ")
                .Append(serializedValue)
                .Append(last ? "\n" : ",\n");
        }

        private static StringBuilder Indent(StringBuilder json, int count)
        {
            return json.Append(' ', count * 2);
        }

        private static string Quote(string value)
        {
            StringBuilder escaped = new StringBuilder(value.Length + 2);
            escaped.Append('"');
            foreach (char character in value)
            {
                switch (character)
                {
                    case '"': escaped.Append("\\\""); break;
                    case '\\': escaped.Append("\\\\"); break;
                    case '\b': escaped.Append("\\b"); break;
                    case '\f': escaped.Append("\\f"); break;
                    case '\n': escaped.Append("\\n"); break;
                    case '\r': escaped.Append("\\r"); break;
                    case '\t': escaped.Append("\\t"); break;
                    default:
                        if (character < 0x20)
                        {
                            escaped.Append("\\u").Append(((int)character).ToString("x4"));
                        }
                        else
                        {
                            escaped.Append(character);
                        }
                        break;
                }
            }
            return escaped.Append('"').ToString();
        }
    }
}
