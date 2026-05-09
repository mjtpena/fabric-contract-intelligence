namespace Orqentis.AI;

/// <summary>Bound from <c>appsettings.json</c> section <c>"AI"</c>.</summary>
public sealed class AiOptions
{
    public const string SectionName = "AI";

    public AzureOpenAiOptions AzureOpenAI { get; init; } = new();
    public AnthropicOptions Anthropic { get; init; } = new();

    /// <summary>Hard timeout for any AI call. Spec §3 (.github/copilot-instructions §3.5) — 15 s.</summary>
    public TimeSpan CallTimeout { get; init; } = TimeSpan.FromSeconds(15);

    /// <summary>If true, AI calls fall back to Anthropic on Azure OpenAI failure.</summary>
    public bool FallbackEnabled { get; init; } = true;
}

public sealed class AzureOpenAiOptions
{
    public string Endpoint { get; init; } = string.Empty;
    public string DeploymentName { get; init; } = "gpt-4o";
    public string ApiVersion { get; init; } = "2024-10-21";
    /// <summary>API key resolved from Key Vault. Never read from this property in source — DI binds it.</summary>
    public string? ApiKey { get; init; }
}

public sealed class AnthropicOptions
{
    public string Endpoint { get; init; } = "https://api.anthropic.com";
    public string Model { get; init; } = "claude-sonnet-4-5";
    public string? ApiKey { get; init; }
}
