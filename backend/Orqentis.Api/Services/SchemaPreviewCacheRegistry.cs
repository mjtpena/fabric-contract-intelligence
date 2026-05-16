using Microsoft.Extensions.Caching.Memory;

namespace Orqentis.Api.Services;

/// <summary>Tracks schema-preview cache keys so version mutations can evict stale live schema snapshots.</summary>
public interface ISchemaPreviewCacheRegistry
{
    void Track(string key);
    void EvictAll();
}

public sealed class SchemaPreviewCacheRegistry : ISchemaPreviewCacheRegistry
{
    private readonly IMemoryCache _memoryCache;
    private readonly object _gate = new();
    private readonly HashSet<string> _keys = [];

    public SchemaPreviewCacheRegistry(IMemoryCache memoryCache) => _memoryCache = memoryCache;

    public void Track(string key)
    {
        lock (_gate)
        {
            _keys.Add(key);
        }
    }

    public void EvictAll()
    {
        string[] keys;
        lock (_gate)
        {
            keys = _keys.ToArray();
            _keys.Clear();
        }

        foreach (var key in keys)
        {
            _memoryCache.Remove(key);
        }
    }
}
