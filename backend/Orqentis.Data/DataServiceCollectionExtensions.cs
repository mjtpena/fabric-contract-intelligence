using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Orqentis.Data;

public static class DataServiceCollectionExtensions
{
    public static IServiceCollection AddOrqentisData(this IServiceCollection services, IConfiguration config)
    {
        var connStr = config.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres is required.");

        services.AddDbContext<OrqentisDbContext>((_, options) =>
            options.UseNpgsql(connStr, npg => npg.EnableRetryOnFailure(3)));

        return services;
    }
}
