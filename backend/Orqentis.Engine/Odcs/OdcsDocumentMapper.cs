using System.Text.Json;

namespace Orqentis.Engine.Odcs;

internal static class OdcsDocumentMapper
{
    public static ContractDefinition MapToContractDefinition(JsonElement root)
    {
        var infoElement = TryGetCustomPropertyValue(root, "orqentisInfo");
        var freshnessElement = TryGetCustomPropertyValue(root, "orqentisFreshness");
        var qualityElement = TryGetCustomPropertyValue(root, "orqentisQuality");

        return new ContractDefinition
        {
            ApiVersion = GetRequiredString(root, "apiVersion"),
            Kind = GetRequiredString(root, "kind"),
            Id = GetRequiredString(root, "id"),
            Name = GetRequiredString(root, "name"),
            Version = GetRequiredString(root, "version"),
            Status = GetRequiredString(root, "status"),
            Info = MapInfo(root, infoElement),
            Servers = MapServers(root),
            Schema = MapSchema(root),
            Quality = MapQuality(qualityElement),
            Freshness = MapFreshness(freshnessElement),
            Sla = MapSla(root),
        };
    }

    public static IDictionary<string, object?> MapToDocument(ContractDefinition contract)
    {
        ArgumentNullException.ThrowIfNull(contract);

        return new Dictionary<string, object?>
        {
            ["version"] = contract.Version,
            ["apiVersion"] = contract.ApiVersion,
            ["kind"] = contract.Kind,
            ["id"] = contract.Id,
            ["status"] = contract.Status,
            ["name"] = contract.Name,
            ["description"] = new Dictionary<string, object?>
            {
                ["purpose"] = contract.Info.Title,
                ["usage"] = contract.Info.Description ?? contract.Info.Title,
            },
            ["servers"] = contract.Servers.Select(MapServer).ToArray(),
            ["schema"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["name"] = contract.Name,
                    ["physicalType"] = "table",
                    ["description"] = contract.Info.Description ?? contract.Info.Title,
                    ["properties"] = contract.Schema.Select(MapColumn).ToArray(),
                },
            },
            ["slaProperties"] = contract.Sla.Select(MapSlaProperty).ToArray(),
            ["customProperties"] = BuildCustomProperties(contract),
        };
    }

    private static ContractInfo MapInfo(JsonElement root, JsonElement? infoElement)
    {
        if (infoElement is { ValueKind: JsonValueKind.Object } infoObject)
        {
            return new ContractInfo
            {
                Title = GetString(infoObject, "title") ?? GetString(root, "name") ?? string.Empty,
                Description = GetString(infoObject, "description"),
                Owner = GetString(infoObject, "owner") ?? "unknown@example.com",
                Contact = GetContacts(infoObject, "contact"),
            };
        }

        var description = root.TryGetProperty("description", out var descriptionElement) && descriptionElement.ValueKind == JsonValueKind.Object
            ? GetString(descriptionElement, "usage") ?? GetString(descriptionElement, "purpose")
            : null;

        return new ContractInfo
        {
            Title = GetString(root, "name") ?? string.Empty,
            Description = description,
            Owner = "unknown@example.com",
            Contact = [],
        };
    }

    private static IReadOnlyList<ContractServer> MapServers(JsonElement root)
    {
        if (!root.TryGetProperty("servers", out var serversElement) || serversElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return serversElement.EnumerateArray().Select(MapServer).ToArray();
    }

    private static ContractServer MapServer(JsonElement serverElement)
    {
        var path = GetString(serverElement, "location")
            ?? GetString(serverElement, "path")
            ?? string.Empty;

        var workspaceIdStr = GetString(serverElement, "workspaceId");
        Guid? workspaceId = Guid.TryParse(workspaceIdStr, out var parsedGuid) ? parsedGuid : null;

        return new ContractServer
        {
            Name = GetString(serverElement, "server") ?? GetString(serverElement, "name") ?? string.Empty,
            Type = GetString(serverElement, "type") ?? string.Empty,
            Host = GetHost(serverElement, path),
            Path = path,
            Format = GetString(serverElement, "format"),
            WorkspaceId = workspaceId,
        };
    }

    private static IReadOnlyList<ContractColumn> MapSchema(JsonElement root)
    {
        if (!root.TryGetProperty("schema", out var schemaElement) || schemaElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var columns = new List<ContractColumn>();
        foreach (var schemaItem in schemaElement.EnumerateArray())
        {
            if (schemaItem.TryGetProperty("properties", out var propertiesElement) && propertiesElement.ValueKind == JsonValueKind.Array)
            {
                columns.AddRange(propertiesElement.EnumerateArray().Select(MapColumn));
                continue;
            }

            columns.Add(MapColumn(schemaItem));
        }

        return columns;
    }

    private static ContractColumn MapColumn(JsonElement columnElement)
    {
        return new ContractColumn
        {
            Name = GetString(columnElement, "name") ?? string.Empty,
            Type = GetString(columnElement, "physicalType")
                ?? GetString(columnElement, "logicalType")
                ?? string.Empty,
            Required = GetBoolean(columnElement, "required"),
            Unique = GetBoolean(columnElement, "unique"),
            Description = GetString(columnElement, "description"),
            Pii = GetCustomBoolean(columnElement, "pii"),
            PartitionKeyPosition = GetInt32(columnElement, "partitionKeyPosition"),
        };
    }

    private static IReadOnlyList<QualityRule> MapQuality(JsonElement? qualityElement)
    {
        if (qualityElement is not { ValueKind: JsonValueKind.Array } qualityArray)
        {
            return [];
        }

        return qualityArray.EnumerateArray().Select(static item => new QualityRule
        {
            Type = GetRequiredString(item, "type"),
            Column = GetString(item, "column"),
            Threshold = GetDouble(item, "threshold"),
            Pattern = GetString(item, "pattern"),
            Sql = GetString(item, "sql"),
            Severity = GetRequiredString(item, "severity"),
        }).ToArray();
    }

    private static FreshnessRule? MapFreshness(JsonElement? freshnessElement)
    {
        if (freshnessElement is not { ValueKind: JsonValueKind.Object } freshnessObject)
        {
            return null;
        }

        return new FreshnessRule
        {
            MaxAgeHours = GetDouble(freshnessObject, "maxAgeHours") ?? 0,
            Severity = GetRequiredString(freshnessObject, "severity"),
        };
    }

    private static IReadOnlyList<SlaProperty> MapSla(JsonElement root)
    {
        if (!root.TryGetProperty("slaProperties", out var slaElement) || slaElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return slaElement.EnumerateArray().Select(static item => new SlaProperty
        {
            Property = GetRequiredString(item, "property"),
            Value = GetAnyValue(item.GetProperty("value")) ?? string.Empty,
            Unit = GetString(item, "unit"),
        }).ToArray();
    }

    private static object MapServer(ContractServer server)
    {
        var dict = new Dictionary<string, object?>
        {
            ["server"] = server.Name,
            ["type"] = server.Type,
            ["location"] = server.Path,
            ["format"] = server.Format ?? "delta",
        };
        if (server.WorkspaceId.HasValue)
        {
            dict["workspaceId"] = server.WorkspaceId.Value.ToString("D");
        }
        return dict;
    }

    private static object MapColumn(ContractColumn column)
    {
        var customProperties = new[]
        {
            new Dictionary<string, object?>
            {
                ["property"] = "pii",
                ["value"] = column.Pii,
            },
        };

        return new Dictionary<string, object?>
        {
            ["name"] = column.Name,
            ["logicalType"] = MapLogicalType(column.Type),
            ["physicalType"] = column.Type,
            ["required"] = column.Required,
            ["unique"] = column.Unique,
            ["description"] = column.Description,
            ["partitionKeyPosition"] = column.PartitionKeyPosition,
            ["customProperties"] = customProperties,
        };
    }

    private static object MapSlaProperty(SlaProperty property) =>
        new Dictionary<string, object?>
        {
            ["property"] = property.Property,
            ["value"] = property.Value,
            ["unit"] = property.Unit,
        };

    private static object[] BuildCustomProperties(ContractDefinition contract)
    {
        var properties = new List<object>
        {
            new Dictionary<string, object?>
            {
                ["property"] = "orqentisInfo",
                ["value"] = new Dictionary<string, object?>
                {
                    ["title"] = contract.Info.Title,
                    ["description"] = contract.Info.Description,
                    ["owner"] = contract.Info.Owner,
                    ["contact"] = contract.Info.Contact.Select(static contact => new Dictionary<string, object?>
                    {
                        ["name"] = contact.Name,
                        ["email"] = contact.Email,
                        ["role"] = contact.Role,
                    }).ToArray(),
                },
            },
        };

        if (contract.Quality.Count > 0)
        {
            properties.Add(new Dictionary<string, object?>
            {
                ["property"] = "orqentisQuality",
                ["value"] = contract.Quality.Select(static rule => new Dictionary<string, object?>
                {
                    ["type"] = rule.Type,
                    ["column"] = rule.Column,
                    ["threshold"] = rule.Threshold,
                    ["pattern"] = rule.Pattern,
                    ["sql"] = rule.Sql,
                    ["severity"] = rule.Severity,
                }).ToArray(),
            });
        }

        if (contract.Freshness is not null)
        {
            properties.Add(new Dictionary<string, object?>
            {
                ["property"] = "orqentisFreshness",
                ["value"] = new Dictionary<string, object?>
                {
                    ["maxAgeHours"] = contract.Freshness.MaxAgeHours,
                    ["severity"] = contract.Freshness.Severity,
                },
            });
        }

        return properties.ToArray();
    }

    private static IReadOnlyList<ContractContact> GetContacts(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var contactsElement) || contactsElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        return contactsElement.EnumerateArray().Select(static contact => new ContractContact(
            GetString(contact, "name") ?? string.Empty,
            GetString(contact, "email") ?? string.Empty,
            GetString(contact, "role") ?? string.Empty)).ToArray();
    }

    private static JsonElement? TryGetCustomPropertyValue(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty("customProperties", out var customPropertiesElement) || customPropertiesElement.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var customProperty in customPropertiesElement.EnumerateArray())
        {
            if (string.Equals(GetString(customProperty, "property"), propertyName, StringComparison.Ordinal))
            {
                return customProperty.TryGetProperty("value", out var valueElement) ? valueElement : null;
            }
        }

        return null;
    }

    private static bool GetCustomBoolean(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty("customProperties", out var customPropertiesElement) || customPropertiesElement.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        foreach (var customProperty in customPropertiesElement.EnumerateArray())
        {
            if (!string.Equals(GetString(customProperty, "property"), propertyName, StringComparison.Ordinal))
            {
                continue;
            }

            if (!customProperty.TryGetProperty("value", out var valueElement))
            {
                return false;
            }

            return valueElement.ValueKind == JsonValueKind.True ||
                (valueElement.ValueKind == JsonValueKind.String && bool.TryParse(valueElement.GetString(), out var parsed) && parsed);
        }

        return false;
    }

    private static string MapLogicalType(string type) =>
        type.ToUpperInvariant() switch
        {
            "STRING" => "string",
            "DATE" => "date",
            "TIMESTAMP" => "timestamp",
            "INT" or "INTEGER" => "integer",
            "LONG" or "DOUBLE" or "FLOAT" or "DECIMAL" => "number",
            "BOOLEAN" or "BOOL" => "boolean",
            _ => "string",
        };

    private static string? GetHost(JsonElement serverElement, string path)
    {
        var host = GetString(serverElement, "host");
        if (!string.IsNullOrWhiteSpace(host))
        {
            return host;
        }

        if (Uri.TryCreate(path, UriKind.Absolute, out var uri))
        {
            return uri.Host;
        }

        var atIndex = path.IndexOf('@');
        if (atIndex < 0)
        {
            return null;
        }

        var slashIndex = path.IndexOf('/', atIndex);
        return slashIndex >= 0 ? path[(atIndex + 1)..slashIndex] : path[(atIndex + 1)..];
    }

    private static string GetRequiredString(JsonElement root, string propertyName) =>
        GetString(root, propertyName)
        ?? throw new InvalidOperationException($"The property '{propertyName}' is required.");

    private static string? GetString(JsonElement root, string propertyName) =>
        root.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : null;

    private static bool GetBoolean(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var property))
        {
            return false;
        }

        return property.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String when bool.TryParse(property.GetString(), out var parsed) => parsed,
            _ => false,
        };
    }

    private static double? GetDouble(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Number && property.TryGetDouble(out var number))
        {
            return number;
        }

        if (property.ValueKind == JsonValueKind.String && double.TryParse(property.GetString(), out number))
        {
            return number;
        }

        return null;
    }

    private static int? GetInt32(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out var number))
        {
            return number;
        }

        if (property.ValueKind == JsonValueKind.String && int.TryParse(property.GetString(), out number))
        {
            return number;
        }

        return null;
    }

    private static object? GetAnyValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number when element.TryGetInt64(out var integer) => integer,
            JsonValueKind.Number when element.TryGetDouble(out var number) => number,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Object => JsonSerializer.Deserialize<Dictionary<string, object?>>(element.GetRawText()),
            JsonValueKind.Array => JsonSerializer.Deserialize<List<object?>>(element.GetRawText()),
            _ => null,
        };
    }
}
