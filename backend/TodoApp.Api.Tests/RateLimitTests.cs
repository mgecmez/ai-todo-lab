using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using TodoApp.Api.Data;
using Xunit;

namespace TodoApp.Api.Tests;

/// <summary>
/// Rate limit testleri için bağımsız factory.
/// LoginPermitLimit=5 ile yapılandırılmıştır; AuthController_ProfileTests'teki
/// paylaşılan factory'nin rate limit state'ini kirletmez.
/// </summary>
public class RateLimitWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();
    private readonly InMemoryDatabaseRoot _dbRoot = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // InMemory veritabanı — SQLite bağımlılığını kaldır
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null)
                services.Remove(descriptor);

            services.AddSingleton<DbContextOptions<AppDbContext>>(
                new DbContextOptionsBuilder<AppDbContext>()
                    .UseInMemoryDatabase(_databaseName, _dbRoot)
                    .EnableServiceProviderCaching(false)
                    .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                    .Options);
        });

        // JWT ayarları
        builder.UseSetting("Jwt:Secret", CustomWebApplicationFactory.TestJwtSecret);
        builder.UseSetting("Jwt:Issuer",   "TodoApp");
        builder.UseSetting("Jwt:Audience", "TodoApp");
        builder.UseSetting("Jwt:AccessTokenExpiryMinutes", "60");
        builder.UseSetting("Jwt:RefreshTokenExpiryDays", "30");

        // Test için düşük rate limit: 5 istek / 60 saniye penceresi
        builder.UseSetting("RateLimit:LoginWindowSeconds", "60");
        builder.UseSetting("RateLimit:LoginPermitLimit",   "5");
    }
}

public class RateLimitTests(RateLimitWebApplicationFactory factory)
    : IClassFixture<RateLimitWebApplicationFactory>
{
    [Fact]
    public async Task RateLimit_Login_Returns429_AfterExceedingLimit()
    {
        var client = factory.CreateClient();
        var loginBody = new { email = "ratelimit@test.com", password = "wrongpassword" };

        // First 5 attempts should return 401 (or 400 — not 429)
        for (int i = 0; i < 5; i++)
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", loginBody);
            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        // 6th attempt must return 429
        var sixthResponse = await client.PostAsJsonAsync("/api/auth/login", loginBody);
        Assert.Equal(HttpStatusCode.TooManyRequests, sixthResponse.StatusCode);
        Assert.True(sixthResponse.Headers.Contains("Retry-After"),
            "Response should include Retry-After header");

        var body = await sixthResponse.Content.ReadFromJsonAsync<RateLimitErrorResponse>();
        Assert.NotNull(body);
        Assert.Equal(429, body.Status);
    }
}

internal record RateLimitErrorResponse(int Status, string Message);
