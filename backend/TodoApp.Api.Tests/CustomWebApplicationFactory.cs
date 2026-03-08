using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using TodoApp.Api.Data;

namespace TodoApp.Api.Tests;

/// <summary>
/// Entegrasyon testleri için özelleştirilmiş WebApplicationFactory.
///
/// Üretim ortamında AppDbContext SQLite kullanır. Bu factory, test ortamında
/// AppDbContext seçeneklerini EF Core InMemory provider ile override eder.
///
/// ── Tasarım kararları ──────────────────────────────────────────────────────
///
/// 1) AddDbContext yerine doğrudan DbContextOptions<AppDbContext> singleton'ı
///    değiştirilir. İki kez AddDbContext çağrısı yapılırsa hem SQLite hem
///    InMemory provider servisleri DI'a eklenir; EF Core tek provider
///    kabul ettiğinden exception fırlatır.
///
/// 2) EnableServiceProviderCaching(false): Her DbContext kendi EF Core iç
///    servis sağlayıcısını oluşturur. Bu, SQLite iç servislerinin önbellekte
///    kalıp InMemory ile çakışmasını önler.
///
/// 3) InMemoryDatabaseRoot: Servis sağlayıcı önbelleği kapalıyken bile tüm
///    DbContext instance'ları aynı fiziksel InMemory veritabanını paylaşır.
///    Böylece POST'un yazdığı veri aynı fabrika içindeki GET tarafından görülür.
///
/// 4) _databaseName: Her factory instance'ı için benzersiz Guid.
///    IClassFixture ile fabrika paylaşıldığında test sınıfı bazında izolasyon
///    sağlanır. Tam test metodu izolasyonu için her metotta yeni factory gerekir.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = Guid.NewGuid().ToString();

    // Aynı factory içindeki tüm DbContext instance'larının paylaşacağı InMemory kök.
    // EnableServiceProviderCaching(false) ile birlikte kullanıldığında izole iç
    // servis sağlayıcıları farklı veri mağazaları oluşturur; bu root bunu engeller.
    private readonly InMemoryDatabaseRoot _dbRoot = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // 1) Program.cs'ten gelen SQLite DbContextOptions kaydını kaldır.
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));

            if (descriptor is not null)
                services.Remove(descriptor);

            // 2) InMemory provider ile yeni options ekle.
            //    - Paylaşımlı _dbRoot → aynı fabrikadaki tüm istekler aynı veritabanını görür.
            //    - EnableServiceProviderCaching(false) → SQLite iç servis önbelleğiyle çakışmayı önler.
            services.AddSingleton<DbContextOptions<AppDbContext>>(
                new DbContextOptionsBuilder<AppDbContext>()
                    .UseInMemoryDatabase(_databaseName, _dbRoot)
                    .EnableServiceProviderCaching(false)
                    .Options);
        });
    }
}
