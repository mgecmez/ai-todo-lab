using Microsoft.EntityFrameworkCore;
using TodoApp.Api.Data;
using TodoApp.Api.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ── EF Core + SQLite ────────────────────────────────────────────────────────
// Connection string appsettings.json'dan okunur.
// Dosya yolu ContentRootPath ile mutlaklaştırılır; böylece "dotnet run" ve
// publish çıktısı gibi farklı çalışma dizinlerinde todos.db hep aynı yerde oluşur.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("'DefaultConnection' bulunamadı. appsettings.json dosyasını kontrol et.");

var dbPath = connectionString.Replace("Data Source=", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
if (!Path.IsPathRooted(dbPath))
{
    dbPath = Path.Combine(builder.Environment.ContentRootPath, dbPath);
    connectionString = $"Data Source={dbPath}";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// ── Repository kaydı ────────────────────────────────────────────────────────
// Scoped: her HTTP isteği kendi DbContext instance'ını alır (EF Core gerekliliği).
builder.Services.AddScoped<ITodoRepository, EfTodoRepository>();

// ── CORS ────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// ── Otomatik migration ──────────────────────────────────────────────────────
// Uygulama her başladığında bekleyen migration varsa otomatik olarak uygular.
// todos.db yoksa oluşturur; InitialCreate migration'ı çalıştırır.
// IsRelational() kontrolü: InMemory provider (entegrasyon testleri) bu bloğu atlar.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (dbContext.Database.IsRelational())
        dbContext.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
