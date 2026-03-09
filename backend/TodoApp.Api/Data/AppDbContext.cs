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

            // CreatedAt ve UpdatedAt: zorunlu
            // Değer ataması repository sorumluluğundadır (DateTime.UtcNow).
            entity.Property(t => t.CreatedAt)
                  .IsRequired();

            entity.Property(t => t.UpdatedAt)
                  .IsRequired();
        });
    }
}
