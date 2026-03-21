using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TodoApp.Api.Data;
using TodoApp.Api.Models;
using TodoApp.Api.Repositories;
using TodoApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// ── EF Core + SQLite ────────────────────────────────────────────────────────
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

// ── JWT Authentication ───────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("'Jwt:Secret' bulunamadı.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddAuthorization();

// ── Repository ve Service kayıtları ─────────────────────────────────────────
builder.Services.AddScoped<ITodoRepository, EfTodoRepository>();
builder.Services.AddScoped<ITodoService, TodoService>();
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

// ── Rate Limiting ─────────────────────────────────────────────────────────────
var loginWindowSeconds    = builder.Configuration.GetValue<int>("RateLimit:LoginWindowSeconds", 900);
var loginPermitLimit      = builder.Configuration.GetValue<int>("RateLimit:LoginPermitLimit", 5);
var registerWindowSeconds = builder.Configuration.GetValue<int>("RateLimit:RegisterWindowSeconds", 3600);
var registerPermitLimit   = builder.Configuration.GetValue<int>("RateLimit:RegisterPermitLimit", 10);

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                Window               = TimeSpan.FromSeconds(loginWindowSeconds),
                PermitLimit          = loginPermitLimit,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit           = 0,
            }
        )
    );

    options.AddPolicy("register", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                Window               = TimeSpan.FromSeconds(registerWindowSeconds),
                PermitLimit          = registerPermitLimit,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit           = 0,
            }
        )
    );

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;

        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"status\":429,\"message\":\"Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.\"}",
            cancellationToken);
    };
});

// ── CORS ─────────────────────────────────────────────────────────────────────
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

// ── Otomatik migration ───────────────────────────────────────────────────────
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

// Middleware sıralaması kritik: RateLimiter → Authentication → Authorization
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
