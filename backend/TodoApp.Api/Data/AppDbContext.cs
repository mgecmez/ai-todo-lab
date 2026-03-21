using Microsoft.EntityFrameworkCore;
using TodoApp.Api.Models;

namespace TodoApp.Api.Data;

/// <summary>
/// EF Core veritabanı bağlam sınıfı.
/// Tüm DbSet'ler ve entity konfigürasyonları burada tanımlanır.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    /// <summary>Todo tablosunu temsil eden koleksiyon.</summary>
    public DbSet<Todo> Todos { get; set; }

    /// <summary>User tablosunu temsil eden koleksiyon.</summary>
    public DbSet<User> Users { get; set; }

    /// <summary>RefreshToken tablosunu temsil eden koleksiyon.</summary>
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Todo>(entity =>
        {
            // Primary Key — EF Core "Id" adını convention ile zaten tanır;
            // explicit yazmak niyeti belgeler.
            entity.HasKey(t => t.Id);

            // Title: zorunlu, maksimum 200 karakter
            entity.Property(t => t.Title)
                  .IsRequired()
                  .HasMaxLength(200);

            // Description: isteğe bağlı (nullable), maksimum 1000 karakter
            entity.Property(t => t.Description)
                  .HasMaxLength(1000);

            // Priority: zorunlu; veritabanında integer olarak saklanır (EF Core convention).
            // Varsayılan değer Normal (1) — migration'da mevcut satırlar bu değeri alır.
            entity.Property(t => t.Priority)
                  .IsRequired()
                  .HasDefaultValue(TodoPriority.Normal);

            // DueDate: isteğe bağlı (nullable); ek konfigürasyon gerekmez.
            entity.Property(t => t.DueDate);

            // IsPinned: zorunlu; varsayılan false — migration'da mevcut satırlar false alır.
            entity.Property(t => t.IsPinned)
                  .IsRequired()
                  .HasDefaultValue(false);

            // Tags: isteğe bağlı (nullable), maksimum 500 karakter (virgülle ayrılmış etiketler).
            entity.Property(t => t.Tags)
                  .HasMaxLength(500);

            // UserId: isteğe bağlı (nullable), maksimum 36 karakter (GUID string).
            entity.Property(t => t.UserId)
                  .HasMaxLength(36);

            // IX_Todos_UserId: kullanıcıya göre filtreleme için index.
            entity.HasIndex(t => t.UserId).HasDatabaseName("IX_Todos_UserId");

            // CreatedAt ve UpdatedAt: zorunlu
            // Değer ataması repository sorumluluğundadır (DateTime.UtcNow).
            entity.Property(t => t.CreatedAt)
                  .IsRequired();

            entity.Property(t => t.UpdatedAt)
                  .IsRequired();

            // Soft delete alanları
            entity.Property(t => t.IsDeleted)
                  .IsRequired()
                  .HasDefaultValue(false);

            entity.Property(t => t.DeletedAt);

            entity.HasQueryFilter(t => !t.IsDeleted);

            entity.HasIndex(t => new { t.UserId, t.IsDeleted })
                  .HasDatabaseName("IX_Todos_UserId_IsDeleted");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);

            // Email: zorunlu, maksimum 256 karakter, unique index
            entity.Property(u => u.Email)
                  .IsRequired()
                  .HasMaxLength(256);

            entity.HasIndex(u => u.Email)
                  .IsUnique()
                  .HasDatabaseName("IX_Users_Email");

            // PasswordHash: zorunlu
            entity.Property(u => u.PasswordHash)
                  .IsRequired();

            // CreatedAt: zorunlu
            entity.Property(u => u.CreatedAt)
                  .IsRequired();

            // Soft delete alanları
            entity.Property(u => u.IsDeleted)
                  .IsRequired()
                  .HasDefaultValue(false);

            entity.Property(u => u.DeletedAt);

            entity.HasQueryFilter(u => !u.IsDeleted);

            entity.HasIndex(u => new { u.Email, u.IsDeleted })
                  .HasDatabaseName("IX_Users_Email_IsDeleted");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(r => r.Id);

            entity.Property(r => r.TokenHash)
                  .IsRequired()
                  .HasMaxLength(64);

            entity.HasIndex(r => r.TokenHash)
                  .IsUnique()
                  .HasDatabaseName("IX_RefreshTokens_TokenHash");

            entity.Property(r => r.ExpiresAt).IsRequired();
            entity.Property(r => r.CreatedAt).IsRequired();

            entity.HasOne(r => r.User)
                  .WithMany()
                  .HasForeignKey(r => r.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
