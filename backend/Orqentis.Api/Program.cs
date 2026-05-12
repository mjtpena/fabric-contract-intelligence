using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Orqentis.AI;
using Orqentis.Api.Auth;
using Orqentis.Api.Middleware;
using Orqentis.Api.Services;
using Orqentis.Data;
using Orqentis.Engine;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, loggerConfiguration) => loggerConfiguration
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("service", "orqentis-api")
    .WriteTo.Console());

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

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<HttpTenantContext>();
builder.Services.AddScoped<ITenantContext>(serviceProvider => serviceProvider.GetRequiredService<HttpTenantContext>());
builder.Services.AddScoped<IContractStore, ContractStore>();
builder.Services.AddScoped<IOneLakeTokenBroker, OneLakeTokenBroker>();
builder.Services.AddHttpClient<IActivatorClient, ActivatorClient>();
builder.Services.AddHttpClient("fabric-rest", client =>
{
    client.BaseAddress = new Uri("https://api.fabric.microsoft.com/");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});
builder.Services.AddHttpClient<Orqentis.Api.Services.Webhooks.IGenericWebhookSender, Orqentis.Api.Services.Webhooks.GenericWebhookSender>();
builder.Services.AddHttpClient<Orqentis.Api.Services.Webhooks.ISlackWebhookSender, Orqentis.Api.Services.Webhooks.SlackWebhookSender>();
builder.Services.AddScoped<IBreachAlertDispatcher, BreachAlertDispatcher>();

builder.Services.AddOrqentisData(builder.Configuration);
builder.Services.AddOrqentisEngine();
builder.Services.AddOrqentisAi(builder.Configuration);

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
    .AddCheck<OrqentisDatabaseHealthCheck>("postgres", tags: ["ready"])
    .AddCheck<KeyVaultConfigurationHealthCheck>("key-vault", tags: ["ready"]);

builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();

var postgresConnectionString = builder.Configuration.GetConnectionString("Postgres");
if (!string.IsNullOrWhiteSpace(postgresConnectionString))
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    try
    {
        DatabaseMigrator.Migrate(postgresConnectionString, logger);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database-MigrateFailed");
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
app.UseCors("fabric-origins");
app.UseAuthentication();
app.UseMiddleware<TenantContextMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health").AllowAnonymous();
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
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
        IssuerValidator = (issuer, token, _) => ValidateIssuer(issuer, token, authorityBase, azureAdOptions.ValidIssuer),
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
    SecurityToken securityToken,
    string authorityBase,
    string? configuredIssuer)
{
    if (!string.IsNullOrWhiteSpace(configuredIssuer))
    {
        if (string.Equals(issuer, configuredIssuer, StringComparison.OrdinalIgnoreCase))
        {
            return issuer;
        }

        throw new SecurityTokenInvalidIssuerException($"Unexpected issuer '{issuer}'.");
    }

    if (securityToken is not JwtSecurityToken jwtToken)
    {
        throw new SecurityTokenInvalidIssuerException("Unsupported token type.");
    }

    var tenantId = jwtToken.Claims.FirstOrDefault(claim => claim.Type == "tid")?.Value;
    if (string.IsNullOrWhiteSpace(tenantId))
    {
        throw new SecurityTokenInvalidIssuerException("Token tenant claim is missing.");
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
