using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using TodoApp.Api.Data;

namespace TodoApp.Api.Tests;

/// <summary>
/// Entegrasyon testleri için özelleştirilmiş WebApplicationFactory.
///
/// Üretim ortamında AppDbContext SQLite kullanır. Bu factory, test ortamında
/// AppDbContext seçeneklerini EF Core InMemory provider ile override eder.
/// JWT Secret de test değeriyle override edilir.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();
    private readonly InMemoryDatabaseRoot _dbRoot = new();

    /// <summary>Test ortamında kullanılan sabit JWT secret.</summary>
    public const string TestJwtSecret = "test-secret-key-for-integration-tests-32chars";
    public const string TestUserId = "test-user-id-12345";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // InMemory veritabanı
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));

            if (descriptor is not null)
                services.Remove(descriptor);

            services.AddSingleton<DbContextOptions<AppDbContext>>(
                new DbContextOptionsBuilder<AppDbContext>()
                    .UseInMemoryDatabase(_databaseName, _dbRoot)
                    .EnableServiceProviderCaching(false)
                    .Options);
        });

        // JWT test secret'ı override et
        builder.UseSetting("Jwt:Secret", TestJwtSecret);
        builder.UseSetting("Jwt:Issuer", "TodoApp");
        builder.UseSetting("Jwt:Audience", "TodoApp");
        builder.UseSetting("Jwt:ExpiryDays", "7");
    }

    /// <summary>
    /// Test kullanıcısı için geçerli JWT token üretir.
    /// </summary>
    public static string GenerateTestToken(string userId = TestUserId)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   userId),
            new Claim(JwtRegisteredClaimNames.Email, "test@example.com"),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:             "TodoApp",
            audience:           "TodoApp",
            claims:             claims,
            expires:            DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Test token'ı ile kimlik doğrulaması yapılmış HttpClient döndürür.
    /// </summary>
    public HttpClient CreateAuthenticatedClient(string? userId = null)
    {
        var client = CreateClient();
        var token  = GenerateTestToken(userId ?? TestUserId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
