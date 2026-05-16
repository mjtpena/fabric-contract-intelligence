using System.Globalization;
using System.IO.Compression;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Orqentis.AI;
using Orqentis.Api.Auth;
using Orqentis.Api.Http;
using Orqentis.Api.Middleware;
using Orqentis.Api.Services;
using Orqentis.Api.Services.Webhooks;
using Orqentis.Data;
using Orqentis.Data.Entities;
using Orqentis.Engine;
using Polly;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, loggerConfiguration) =>
{
    var appInsightsConnectionString = ctx.Configuration["ApplicationInsights:ConnectionString"]
        ?? ctx.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];

    loggerConfiguration
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("service", "orqentis-api")
        .WriteTo.Console();

    if (!string.IsNullOrWhiteSpace(appInsightsConnectionString))
    {
        loggerConfiguration.WriteTo.ApplicationInsights(
            appInsightsConnectionString,
            new Serilog.Sinks.ApplicationInsights.TelemetryConverters.TraceTelemetryConverter(),
            Serilog.Events.LogEventLevel.Warning);
    }
});

builder.Services.Configure<AzureAdOptions>(builder.Configuration.GetSection("AzureAd"));
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        var correlationId = context.HttpContext.Items[CorrelationIdMiddleware.HeaderName] as string;
        if (!string.IsNullOrWhiteSpace(correlationId))
        {
            context.ProblemDetails.Extensions["correlationId"] = correlationId;
        }
    };
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => ConfigureJwtBearer(options, builder.Configuration, builder.Environment));

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context => FixedIpWindow(context, 100));
    options.AddPolicy("default", context => FixedIpWindow(context, 100));
    options.AddPolicy("auth", context => FixedIpWindow(context, 30));
    options.AddPolicy("ai-endpoints", context => FixedUserWindow(context, 10));
    options.OnRejected = async (context, _) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }

        await WriteProblemAsync(
            context.HttpContext,
            StatusCodes.Status429TooManyRequests,
            "Too many requests.",
            "The rate limit for this endpoint has been exceeded.").ConfigureAwait(false);
    };
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache(opts => opts.SizeLimit = 64 * 1024 * 1024 /* 64 MB */);
builder.Services.AddOutputCache(opts =>
{
    opts.AddBasePolicy(builder => builder.Expire(TimeSpan.FromSeconds(30)));
});
builder.Services.AddResponseCompression(opts =>
{
    opts.EnableForHttps = true;
    opts.Providers.Add<BrotliCompressionProvider>();
    opts.Providers.Add<GzipCompressionProvider>();
    opts.MimeTypes = ResponseCompressionDefaults.MimeTypes
        .Concat(["application/x-yaml", "application/problem+json"]);
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
builder.Services.AddScoped<HttpTenantContext>();
builder.Services.AddScoped<ITenantContext>(serviceProvider => serviceProvider.GetRequiredService<HttpTenantContext>());
builder.Services.AddScoped<IContractStore, ContractStore>();
builder.Services.AddSingleton<ISchemaPreviewCacheRegistry, SchemaPreviewCacheRegistry>();
builder.Services.AddTransient<CorrelationIdDelegatingHandler>();
builder.Services.AddSingleton<IOboTokenAcquirer, AzureIdentityOboTokenAcquirer>();
builder.Services.AddSingleton<IOneLakeTokenBroker, OneLakeTokenBroker>();
ConfigureOutboundResilience(
    builder.Services.AddHttpClient<IActivatorClient, ActivatorClient>(client => client.Timeout = TimeSpan.FromSeconds(30)),
    TimeSpan.FromSeconds(10));
ConfigureOutboundResilience(
    builder.Services.AddHttpClient("fabric-rest", client =>
    {
        client.BaseAddress = new Uri("https://api.fabric.microsoft.com/");
        client.DefaultRequestHeaders.Add("Accept", "application/json");
        client.Timeout = TimeSpan.FromSeconds(30);
    }),
    TimeSpan.FromSeconds(10));
ConfigureOutboundResilience(
    builder.Services.AddHttpClient("key-vault-health", client => client.Timeout = TimeSpan.FromSeconds(5)),
    TimeSpan.FromSeconds(5));
ConfigureOutboundResilience(
    builder.Services.AddHttpClient("azure-openai-health", client => client.Timeout = TimeSpan.FromSeconds(5)),
    TimeSpan.FromSeconds(5));
builder.Services.AddHttpClient<Orqentis.Api.Services.Webhooks.IGenericWebhookSender, Orqentis.Api.Services.Webhooks.GenericWebhookSender>();
builder.Services.AddHttpClient<Orqentis.Api.Services.Webhooks.ISlackWebhookSender, Orqentis.Api.Services.Webhooks.SlackWebhookSender>();
builder.Services.AddScoped<IBreachAlertDispatcher, BreachAlertDispatcher>();
builder.Services.AddSingleton<IWebhookDnsResolver, WebhookDnsResolver>();
builder.Services.AddSingleton<WebhookUrlValidator>();

builder.Services.AddOrqentisData(builder.Configuration);
builder.Services.AddOrqentisEngine(client => client.AddHttpMessageHandler<CorrelationIdDelegatingHandler>());
builder.Services.AddOrqentisAi(builder.Configuration, client => client.AddHttpMessageHandler<CorrelationIdDelegatingHandler>());

builder.Services.AddCors(options =>
{
    options.AddPolicy("fabric-origins", policy =>
    {
        var origins = new[]
        {
            "https://app.fabric.microsoft.com",
            builder.Configuration["Frontend:Origin"],
        }
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Cast<string>()
        .ToArray();

        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Orqentis API",
        Version = "v1",
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });
});

builder.Services
    .AddHealthChecks()
    .AddCheck<OrqentisDatabaseHealthCheck>("postgres", tags: ["ready"], timeout: TimeSpan.FromSeconds(5))
    .AddCheck<KeyVaultReachabilityHealthCheck>("key-vault", tags: ["ready"], timeout: TimeSpan.FromSeconds(5))
    .AddCheck<AzureOpenAiHealthCheck>("azure-openai", tags: ["ready"], timeout: TimeSpan.FromSeconds(5))
    .AddCheck<FabricRestHealthCheck>("fabric-rest", tags: ["ready"], timeout: TimeSpan.FromSeconds(5));

builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();

Log.Information("App starting at {Now}", DateTimeOffset.UtcNow);

var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres");
if (!app.Environment.IsEnvironment("Testing") && !string.IsNullOrWhiteSpace(postgresConnectionString))
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    try
    {
        DatabaseMigrator.Migrate(postgresConnectionString, logger);
        await EnsureConfiguredTenantAsync(app.Services, builder.Configuration, logger).ConfigureAwait(false);
    }
    catch (Exception ex)
    {
        logger.LogCritical(ex, "Database-MigrateFailed");
        Log.Fatal(ex, "Database-MigrateFailed");
        throw;
    }
}

app.UseSerilogRequestLogging();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseSwagger();
app.UseSwaggerUI();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseResponseCompression();
app.UseCors("fabric-origins");
app.UseAuthentication();
app.UseMiddleware<WorkspaceContextMiddleware>();
app.UseMiddleware<TenantContextMiddleware>();
app.UseAuthorization();
app.UseRateLimiter();
app.UseOutputCache();
app.UseIdempotency();
app.MapControllers();
app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
app.MapGet("/healthz", () => Results.Ok()).AllowAnonymous();
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false,
}).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var checks = report.Entries.ToDictionary(
            e => e.Key,
            e => $"{e.Value.Status.ToString().ToLowerInvariant()}: {e.Value.Description ?? e.Value.Exception?.Message ?? "no detail"}");
        var result = new
        {
            status = report.Status.ToString().ToLowerInvariant(),
            checks,
            timestamp = DateTimeOffset.UtcNow,
        };
        await context.Response.WriteAsJsonAsync(result);
    },
}).AllowAnonymous();

app.Run();

static void ConfigureOutboundResilience(IHttpClientBuilder builder, TimeSpan attemptTimeout)
{
    builder
        .AddHttpMessageHandler<CorrelationIdDelegatingHandler>()
        .AddStandardResilienceHandler(options =>
        {
            options.Retry.MaxRetryAttempts = 3;
            options.Retry.Delay = TimeSpan.FromSeconds(1);
            options.Retry.MaxDelay = TimeSpan.FromSeconds(8);
            options.Retry.BackoffType = DelayBackoffType.Exponential;
            options.Retry.UseJitter = true;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
            options.CircuitBreaker.MinimumThroughput = 10;
            options.CircuitBreaker.FailureRatio = 1.0;
            options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
            options.AttemptTimeout.Timeout = attemptTimeout;
            options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(60);
        });
}

static void ConfigureJwtBearer(
    JwtBearerOptions options,
    IConfiguration configuration,
    IWebHostEnvironment environment)
{
    var azureAdOptions = configuration.GetSection("AzureAd").Get<AzureAdOptions>() ?? new AzureAdOptions();
    var authorityBase = (azureAdOptions.Instance ?? "https://login.microsoftonline.com").TrimEnd('/');

    options.MapInboundClaims = false;
    options.RequireHttpsMetadata = string.IsNullOrWhiteSpace(azureAdOptions.MetadataAddress)
        ? !environment.IsDevelopment()
        : azureAdOptions.MetadataAddress.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
    if (!string.IsNullOrWhiteSpace(azureAdOptions.MetadataAddress))
    {
        options.MetadataAddress = azureAdOptions.MetadataAddress;
    }

    if (string.IsNullOrWhiteSpace(azureAdOptions.MetadataAddress))
    {
        var tenantSegment = string.IsNullOrWhiteSpace(azureAdOptions.TenantId)
            ? "common"
            : azureAdOptions.TenantId;
        options.Authority = $"{authorityBase}/{tenantSegment}/v2.0";
    }

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        NameClaimType = "preferred_username",
        RoleClaimType = "roles",
        ValidAudiences = BuildValidAudiences(azureAdOptions).ToArray(),
        IssuerValidator = (issuer, _, _) => ValidateIssuer(issuer, authorityBase, azureAdOptions.ValidIssuer, azureAdOptions.TenantId),
    };

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogWarning(context.Exception, "JwtAuth-Failed");
            return Task.CompletedTask;
        },
        OnChallenge = async context =>
        {
            context.HandleResponse();
            await WriteProblemAsync(
                context.HttpContext,
                StatusCodes.Status401Unauthorized,
                "Unauthorized.",
                "The supplied bearer token is invalid or expired.").ConfigureAwait(false);
        },
        OnForbidden = context => WriteProblemAsync(
            context.HttpContext,
            StatusCodes.Status403Forbidden,
            "Forbidden.",
            "The caller does not have access to this resource."),
    };
}

static RateLimitPartition<string> FixedIpWindow(HttpContext context, int permitLimit)
{
    var partitionKey = context.Connection.RemoteIpAddress?.ToString() ?? "unknown-ip";
    return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
    {
        PermitLimit = permitLimit,
        Window = TimeSpan.FromMinutes(1),
        QueueLimit = 0,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        AutoReplenishment = true,
    });
}

static RateLimitPartition<string> FixedUserWindow(HttpContext context, int permitLimit)
{
    var partitionKey = context.User.FindFirst("oid")?.Value
        ?? context.Connection.RemoteIpAddress?.ToString()
        ?? "anonymous";
    return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
    {
        PermitLimit = permitLimit,
        Window = TimeSpan.FromMinutes(1),
        QueueLimit = 0,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        AutoReplenishment = true,
    });
}

static IEnumerable<string> BuildValidAudiences(AzureAdOptions options)
{
    if (!string.IsNullOrWhiteSpace(options.Audience))
    {
        yield return options.Audience;
    }

    if (!string.IsNullOrWhiteSpace(options.ClientId))
    {
        yield return options.ClientId;
        yield return $"api://{options.ClientId}";
    }
}

static string ValidateIssuer(
    string issuer,
    string authorityBase,
    string? configuredIssuer,
    string? configuredTenantId)
{
    if (!string.IsNullOrWhiteSpace(configuredIssuer))
    {
        if (string.Equals(issuer, configuredIssuer, StringComparison.OrdinalIgnoreCase))
        {
            return issuer;
        }

        throw new SecurityTokenInvalidIssuerException($"Unexpected issuer '{issuer}'.");
    }

    var tenantId = TryGetTenantIdFromIssuer(issuer);
    if (string.IsNullOrWhiteSpace(tenantId))
    {
        throw new SecurityTokenInvalidIssuerException($"Unable to determine tenant from issuer '{issuer}'.");
    }

    if (!string.IsNullOrWhiteSpace(configuredTenantId) &&
        !string.Equals(configuredTenantId, "TBD", StringComparison.OrdinalIgnoreCase) &&
        !string.Equals(configuredTenantId, "common", StringComparison.OrdinalIgnoreCase) &&
        !string.Equals(configuredTenantId, tenantId, StringComparison.OrdinalIgnoreCase))
    {
        throw new SecurityTokenInvalidIssuerException($"Unexpected tenant '{tenantId}'.");
    }

    var validIssuers = new[]
    {
        $"https://sts.windows.net/{tenantId}/",
        $"{authorityBase}/{tenantId}/v2.0",
        $"https://login.microsoftonline.com/{tenantId}/v2.0",
    };

    if (validIssuers.Contains(issuer, StringComparer.OrdinalIgnoreCase))
    {
        return issuer;
    }

    throw new SecurityTokenInvalidIssuerException($"Unexpected issuer '{issuer}'.");
}

static string? TryGetTenantIdFromIssuer(string issuer)
{
    if (!Uri.TryCreate(issuer, UriKind.Absolute, out var uri))
    {
        return null;
    }

    var segments = uri.AbsolutePath
        .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    return segments.Length switch
    {
        >= 2 when string.Equals(segments[0], "tenant", StringComparison.OrdinalIgnoreCase) => segments[1],
        >= 2 when Guid.TryParse(segments[0], out _) => segments[0],
        >= 1 when Guid.TryParse(segments[0], out _) => segments[0],
        _ => null,
    };
}

static async Task EnsureConfiguredTenantAsync(
    IServiceProvider services,
    IConfiguration configuration,
    Microsoft.Extensions.Logging.ILogger logger)
{
    var options = configuration.GetSection("AzureAd").Get<AzureAdOptions>() ?? new AzureAdOptions();
    if (!Guid.TryParse(options.TenantId, out var entraTenantId))
    {
        logger.LogWarning("Tenant-ProvisionSkipped Reason={Reason}", "AzureAd tenant id is not configured.");
        return;
    }

    var requestedTier = configuration["Tenant:Tier"];
    var provisionedTier = string.Equals(requestedTier, "community", StringComparison.OrdinalIgnoreCase)
        ? "community"
        : "enterprise";
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<OrqentisDbContext>();
    var existingTenant = await dbContext.Tenants
        .SingleOrDefaultAsync(tenant => tenant.EntraTenantId == entraTenantId)
        .ConfigureAwait(false);

    if (existingTenant is not null)
    {
        if (!string.Equals(existingTenant.Tier, provisionedTier, StringComparison.OrdinalIgnoreCase))
        {
            existingTenant.Tier = provisionedTier;
            existingTenant.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync().ConfigureAwait(false);
            logger.LogInformation(
                "Tenant-ProvisionUpdated EntraTenantId={EntraTenantId} Tier={Tier}",
                entraTenantId,
                provisionedTier);
        }

        return;
    }

    var now = DateTimeOffset.UtcNow;
    dbContext.Tenants.Add(new Tenant
    {
        TenantId = Guid.NewGuid(),
        EntraTenantId = entraTenantId,
        DisplayName = "Orqentis",
        Tier = provisionedTier,
        Region = "australiaeast",
        Status = "active",
        CreatedAt = now,
        UpdatedAt = now,
    });

    await dbContext.SaveChangesAsync().ConfigureAwait(false);
    logger.LogInformation(
        "Tenant-Provisioned EntraTenantId={EntraTenantId} Tier={Tier}",
        entraTenantId,
        provisionedTier);
}

static async Task WriteProblemAsync(
    HttpContext httpContext,
    int statusCode,
    string title,
    string detail)
{
    httpContext.Response.StatusCode = statusCode;
    var problemDetailsService = httpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
    await problemDetailsService.WriteAsync(new ProblemDetailsContext
    {
        HttpContext = httpContext,
        ProblemDetails =
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Type = $"https://httpstatuses.com/{statusCode}",
        },
    }).ConfigureAwait(false);
}

/// <summary>Exposed for WebApplicationFactory in integration tests.</summary>
public partial class Program;
