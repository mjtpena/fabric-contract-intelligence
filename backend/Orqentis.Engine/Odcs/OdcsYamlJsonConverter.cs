using System.Text.Json;

using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Orqentis.Engine.Odcs;

internal static class OdcsYamlJsonConverter
{
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
        var yamlObject = _deserializer.Deserialize(new StringReader(odcsYaml));
        var json = _jsonSerializer.Serialize(yamlObject);
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }
}
