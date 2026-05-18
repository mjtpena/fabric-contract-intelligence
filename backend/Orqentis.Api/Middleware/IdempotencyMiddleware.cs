using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Orqentis.Data;
using Orqentis.Data.Entities;

namespace Orqentis.Api.Middleware;

/// <summary>Replays recent successful mutating responses when clients retry with the same idempotency key.</summary>
public sealed class IdempotencyMiddleware
{
    private const string _headerName = "Idempotency-Key";
    private static readonly TimeSpan _ttl = TimeSpan.FromHours(24);
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new(StringComparer.Ordinal);

    private readonly RequestDelegate _next;

    public IdempotencyMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        OrqentisDbContext dbContext,
        ITenantContext tenantContext,
        IProblemDetailsService problemDetailsService)
    {
        if (!RequiresIdempotency(context))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        if (!context.Request.Headers.TryGetValue(_headerName, out var rawKey) || string.IsNullOrWhiteSpace(rawKey))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await problemDetailsService.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails =
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Idempotency key required.",
                    Detail = "POST /v1/contracts/{id}/runs requires an Idempotency-Key header.",
                    Type = "https://httpstatuses.com/400",
                },
            }).ConfigureAwait(false);
            return;
        }

        var key = rawKey.ToString().Trim();
        var workspaceId = tenantContext.WorkspaceId;
        var userOid = ParseUserOid(tenantContext.UserObjectId);
        if (workspaceId == Guid.Empty || userOid == Guid.Empty)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await problemDetailsService.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails =
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Idempotency scope unavailable.",
                    Detail = "Workspace and user object identifiers are required for idempotent run creation.",
                    Type = "https://httpstatuses.com/400",
                },
            }).ConfigureAwait(false);
            return;
        }

        var lockKey = $"{workspaceId:N}:{userOid:N}:{key}";
        var gate = _locks.GetOrAdd(lockKey, static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(context.RequestAborted).ConfigureAwait(false);
        try
        {
            var existing = await FindExistingAsync(dbContext, workspaceId, userOid, key, context.RequestAborted).ConfigureAwait(false);
            if (existing is not null)
            {
                context.Response.StatusCode = existing.Status;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(existing.ResponseBody, context.RequestAborted).ConfigureAwait(false);
                return;
            }

            var originalBody = context.Response.Body;
            await using var capture = new MemoryStream();
            context.Response.Body = capture;
            try
            {
                await _next(context).ConfigureAwait(false);

                capture.Position = 0;
                var body = await new StreamReader(capture, Encoding.UTF8, leaveOpen: true).ReadToEndAsync(context.RequestAborted).ConfigureAwait(false);
                if (!string.IsNullOrWhiteSpace(body) && context.Response.StatusCode < StatusCodes.Status500InternalServerError)
                {
                    await StoreAsync(dbContext, workspaceId, userOid, key, body, context.Response.StatusCode, context.RequestAborted).ConfigureAwait(false);
                }

                capture.Position = 0;
                await capture.CopyToAsync(originalBody, context.RequestAborted).ConfigureAwait(false);
            }
            finally
            {
                context.Response.Body = originalBody;
            }
        }
        finally
        {
            gate.Release();
            if (gate.CurrentCount == 1)
            {
                _locks.TryRemove(lockKey, out _);
            }
        }
    }

    private static bool RequiresIdempotency(HttpContext context) =>
        HttpMethods.IsPost(context.Request.Method) &&
        context.Request.Path.StartsWithSegments("/v1/contracts", out var remainder) &&
        remainder.Value?.EndsWith("/runs", StringComparison.OrdinalIgnoreCase) == true;

    private static Task<IdempotencyKey?> FindExistingAsync(
        OrqentisDbContext dbContext,
        Guid workspaceId,
        Guid userOid,
        string key,
        CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        return dbContext.IdempotencyKeys
            .AsNoTracking()
            .SingleOrDefaultAsync(row =>
                row.WorkspaceId == workspaceId &&
                row.UserOid == userOid &&
                row.Key == key &&
                row.ExpiresAt > now,
                ct);
    }

    private static async Task StoreAsync(
        OrqentisDbContext dbContext,
        Guid workspaceId,
        Guid userOid,
        string key,
        string responseBody,
        int status,
        CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = await dbContext.IdempotencyKeys
            .SingleOrDefaultAsync(row => row.WorkspaceId == workspaceId && row.UserOid == userOid && row.Key == key, ct)
            .ConfigureAwait(false);

        if (existing is null)
        {
            dbContext.IdempotencyKeys.Add(new IdempotencyKey
            {
                Key = key,
                WorkspaceId = workspaceId,
                UserOid = userOid,
                ResponseBody = responseBody,
                Status = status,
                CreatedAt = now,
                ExpiresAt = now.Add(_ttl),
            });
        }
        else
        {
            existing.ResponseBody = responseBody;
            existing.Status = status;
            existing.CreatedAt = now;
            existing.ExpiresAt = now.Add(_ttl);
        }

        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    private static Guid ParseUserOid(string value)
    {
        if (Guid.TryParse(value, out var parsed))
        {
            return parsed;
        }

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        var bytes = hash.Take(16).ToArray();
        bytes[7] = (byte)((bytes[7] & 0x0F) | 0x40);
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
        return new Guid(bytes);
    }
}

public static class IdempotencyApplicationBuilderExtensions
{
    public static IApplicationBuilder UseIdempotency(this IApplicationBuilder app) =>
        app.UseMiddleware<IdempotencyMiddleware>();
}
