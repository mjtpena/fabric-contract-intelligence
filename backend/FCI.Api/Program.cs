using FCI.Api.Auth;
using FCI.Api.Middleware;
using FCI.AI;
using FCI.Data;
using FCI.Engine;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.Identity.Web;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ───── Logging (Serilog → Console + ApplicationInsights) ──────────────────────────────
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("service", "fci-api")
    .WriteTo.Console());

// ───── Auth: Entra ID + OBO ───────────────────────────────────────────────────────────
builder.Services
    .AddAuthentication(JwtBearerDefaultsCompat.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"))
    .EnableTokenAcquisitionToCallDownstreamApi()
    .AddInMemoryTokenCaches();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(FciAuthPolicies.Authenticated, p => p.RequireAuthenticatedUser());
    options.AddPolicy(FciAuthPolicies.EnterpriseTier, p =>
        p.RequireAuthenticatedUser().AddRequirements(new EnterpriseTierRequirement()));
});

builder.Services.AddScoped<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, EnterpriseTierHandler>();
builder.Services.AddScoped<ITenantContext, HttpTenantContext>();
builder.Services.AddHttpContextAccessor();

// ───── Domain layers ──────────────────────────────────────────────────────────────────
builder.Services.AddFciData(builder.Configuration);
builder.Services.AddFciEngine();
builder.Services.AddFciAi(builder.Configuration);

// ───── Hangfire (background enforcement runs) ─────────────────────────────────────────
var pgConnStr = builder.Configuration.GetConnectionString("Postgres");
if (!string.IsNullOrWhiteSpace(pgConnStr))
{
    builder.Services.AddHangfire(c => c.UsePostgreSqlStorage(o => o.UseNpgsqlConnection(pgConnStr)));
    builder.Services.AddHangfireServer();
}

// ───── ASP.NET ────────────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

// ───── Telemetry ──────────────────────────────────────────────────────────────────────
builder.Services.AddApplicationInsightsTelemetry();

var app = builder.Build();

// ───── DB migration on startup (DbUp) ─────────────────────────────────────────────────
if (!string.IsNullOrWhiteSpace(pgConnStr) && app.Environment.IsProduction() == false)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    try { DatabaseMigrator.Migrate(pgConnStr, logger); }
    catch (Exception ex) { logger.LogError(ex, "Startup migration failed (continuing for dev only)."); }
}

// ───── Pipeline ───────────────────────────────────────────────────────────────────────
app.UseSerilogRequestLogging();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<TenantContextMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/healthz");

app.Run();

/// <summary>Exposed for WebApplicationFactory in integration tests.</summary>
public partial class Program;

internal static class JwtBearerDefaultsCompat
{
    // Avoids referencing Microsoft.AspNetCore.Authentication.JwtBearer constants at top-level
    // for cleaner namespacing — value matches JwtBearerDefaults.AuthenticationScheme.
    public const string AuthenticationScheme = "Bearer";
}
