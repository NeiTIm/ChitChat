using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using WebChat.Api.Infrastructure.Persistence;

namespace WebChat.Migrations.Postgres;

public sealed class PostgresDbContextFactory
    : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Đọc connection string PostgreSQL từ Environment Variable.
        var connectionString = Environment.GetEnvironmentVariable(
            "CHITCHAT_POSTGRES_CONNECTION"
        );

        // Không được tự động kết nối localhost hoặc SQL Server.
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Missing CHITCHAT_POSTGRES_CONNECTION. " +
                "Please configure Neon PostgreSQL connection string."
            );
        }

        var optionsBuilder =
            new DbContextOptionsBuilder<AppDbContext>();

        optionsBuilder.UseNpgsql(
            connectionString,
            npgsql =>
            {
                npgsql.MigrationsAssembly(
                    typeof(PostgresDbContextFactory)
                        .Assembly.GetName().Name!
                );
            }
        );

        return new AppDbContext(optionsBuilder.Options);
    }
}