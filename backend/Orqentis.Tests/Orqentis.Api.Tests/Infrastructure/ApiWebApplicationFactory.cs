using System.Security.Claims;
using System.Text.Encodings.Web;
using Orqentis.Api.Auth;
using Orqentis.Data;
using Orqentis.Data.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Orqentis.Tests.Orqentis.Api.Tests.Infrastructure;

internal sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly bool _useTestAuthentication;
    private readonly IDictionary<string, string?> _configurationOverrides;
    private readonly Action<IServiceCollection>? _configureServices;
    private readonly string _databaseName = Guid.NewGuid().ToString("N");

    public ApiWebApplicationFactory(
        bool useTestAuthentication = true,
        IDictionary<string, string?>? configurationOverrides = null,
        Action<IServiceCollection>? configureServices = null)
    {
        _useTestAuthentication = useTestAuthentication;
        _configurationOverrides = configurationOverrides ?? new Dictionary<string, string?>();
        _configureServices = configureServices;
    }

    public HttpClient CreateAuthenticatedClient(Guid? entraTenantId = null)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Add("X-Workspace-Id", TestIdentifiers.WorkspaceId.ToString());
        client.DefaultRequestHeaders.Add(TestAuthHandler.TenantHeaderName, (entraTenantId ?? TestIdentifiers.CommunityEntraTenantId).ToString());
        return client;
    }

    public async Task SeedAsync(Action<OrqentisDbContext> seedAction)
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<OrqentisDbContext>();
        seedAction(dbContext);
        await dbContext.SaveChangesAsync().ConfigureAwait(false);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Postgres"] = "Host=localhost;Database=orqentis;Username=orqentis;Password=orqentis",
                ["AzureAd:Instance"] = "https://login.microsoftonline.com/",
                ["AzureAd:ClientId"] = "test-client-id",
                ["AzureAd:Audience"] = "api://test-client-id",
                ["AzureAd:ClientSecret"] = "test-secret",
                ["Frontend:Origin"] = "https://localhost",
            });

            if (_configurationOverrides.Count > 0)
            {
                configuration.AddInMemoryCollection(_configurationOverrides);
            }
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<OrqentisDbContext>>();
            services.RemoveAll<OrqentisDbContext>();
            services.AddDbContext<OrqentisDbContext>(options => options.UseInMemoryDatabase(_databaseName));

            if (_useTestAuthentication)
            {
                services.AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                        options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                        options.DefaultScheme = TestAuthHandler.SchemeName;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                        TestAuthHandler.SchemeName,
                        _ => { });
            }

            _configureServices?.Invoke(services);

            using var scope = services.BuildServiceProvider().CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<OrqentisDbContext>();
            dbContext.Database.EnsureCreated();
            SeedTenants(dbContext);
        });
    }

    private static void SeedTenants(OrqentisDbContext dbContext)
    {
        if (dbContext.Tenants.Any())
        {
            return;
        }

        dbContext.Tenants.AddRange(
            new Tenant
            {
                TenantId = TestIdentifiers.CommunityTenantId,
                EntraTenantId = TestIdentifiers.CommunityEntraTenantId,
                DisplayName = "Community Tenant",
                Tier = "community",
                Region = "australiaeast",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            },
            new Tenant
            {
                TenantId = TestIdentifiers.EnterpriseTenantId,
                EntraTenantId = TestIdentifiers.EnterpriseEntraTenantId,
                DisplayName = "Enterprise Tenant",
                Tier = "enterprise",
                Region = "australiaeast",
                Status = "active",
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            });

        dbContext.SaveChanges();
    }
}

internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";
    public const string TenantHeaderName = "X-Test-Tenant-Id";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var tenantId = Request.Headers[TenantHeaderName].FirstOrDefault()
            ?? TestIdentifiers.CommunityEntraTenantId.ToString();
        var workspaceId = Request.Headers["X-Workspace-Id"].FirstOrDefault()
            ?? TestIdentifiers.WorkspaceId.ToString();

        var claims = new[]
        {
            new Claim("tid", tenantId),
            new Claim("oid", "test-user-object-id"),
            new Claim("preferred_username", "test.user@example.com"),
            new Claim("workspace_id", workspaceId),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
