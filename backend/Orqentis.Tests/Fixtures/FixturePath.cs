namespace Orqentis.Tests.Fixtures;

internal static class FixturePath
{
    public static string FromTestProject(params string[] segments)
    {
        var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."));
        return Path.Combine([root, .. segments]);
    }
}
