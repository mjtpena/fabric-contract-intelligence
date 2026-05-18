using System.Text.Json;

using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Orqentis.Engine.Odcs;

internal static class OdcsYamlJsonConverter
{
    private const int _maxYamlLength = 1_048_576;
    private const int _maxStructureDepth = 30;

    private static readonly IDeserializer _deserializer = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .WithAttemptingUnquotedStringTypeDeserialization()
        .IgnoreUnmatchedProperties()
        .Build();

    private static readonly ISerializer _jsonSerializer = new SerializerBuilder()
        .JsonCompatible()
        .Build();

    public static JsonElement ConvertToJsonElement(string odcsYaml)
    {
        if (odcsYaml.Length >= _maxYamlLength)
        {
            throw new InvalidOperationException("ODCS YAML must be smaller than 1 MB.");
        }

        var yamlObject = _deserializer.Deserialize(new StringReader(odcsYaml));
        var json = _jsonSerializer.Serialize(yamlObject);
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement.Clone();
        if (GetDepth(root) > _maxStructureDepth)
        {
            throw new InvalidOperationException($"ODCS YAML structure depth must not exceed {_maxStructureDepth} levels.");
        }

        return root;
    }

    private static int GetDepth(JsonElement element) =>
        element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject().Select(property => GetDepth(property.Value)).DefaultIfEmpty(0).Max() + 1,
            JsonValueKind.Array => element.EnumerateArray().Select(GetDepth).DefaultIfEmpty(0).Max() + 1,
            _ => 1,
        };
}
