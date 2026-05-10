namespace Orqentis.AI;

public interface IPromptLoader
{
    string Load(string fileName);
}

public sealed class PromptLoader : IPromptLoader
{
    private readonly Lazy<IReadOnlyDictionary<string, string>> _cache;

    public PromptLoader()
    {
        _cache = new Lazy<IReadOnlyDictionary<string, string>>(LoadPrompts);
    }

    public string Load(string fileName)
    {
        if (_cache.Value.TryGetValue(fileName, out var content))
        {
            return content;
        }

        throw new FileNotFoundException($"AI prompt file '{fileName}' was not found in Prompts directory.");
    }

    private static IReadOnlyDictionary<string, string> LoadPrompts()
    {
        var promptDirectory = Path.Combine(AppContext.BaseDirectory, "Prompts");
        if (!Directory.Exists(promptDirectory))
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }

        return Directory
            .EnumerateFiles(promptDirectory, "*.txt", SearchOption.TopDirectoryOnly)
            .ToDictionary(
                path => Path.GetFileName(path),
                File.ReadAllText,
                StringComparer.OrdinalIgnoreCase);
    }
}
