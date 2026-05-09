using System.Text.Json;

using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Orqentis.Engine.Odcs;

internal static class OdcsYamlJsonConverter
{
    private static readonly IDeserializer Deserializer = new DeserializerBuilder()
        .WithNamingConvention(CamelCaseNamingConvention.Instance)
        .WithAttemptingUnquotedStringTypeDeserialization()
        .IgnoreUnmatchedProperties()
        .Build();

    private static readonly ISerializer JsonSerializer = new SerializerBuilder()
        .JsonCompatible()
        .Build();

    public static JsonElement ConvertToJsonElement(string odcsYaml)
    {
        var yamlObject = Deserializer.Deserialize(new StringReader(odcsYaml));
        var json = JsonSerializer.Serialize(yamlObject);
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }
}
