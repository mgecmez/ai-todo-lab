using TodoApp.Api.Data;
using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories;

/// <summary>
/// ITodoRepository'nin EF Core + SQLite implementasyonu.
/// lock mekanizması yerine EF Core'un Scoped DbContext izolasyonuna dayanır.
///
/// Not: ITodoRepository imzaları senkron olduğundan EF Core'un senkron
/// API'leri (SaveChanges, Find, ToList…) kullanılmaktadır.
/// </summary>
public class EfTodoRepository(AppDbContext dbContext) : ITodoRepository
{
    /// <summary>
    /// Tüm todo'ları sıralar:
    ///   1. IsPinned DESC   — sabitlenmiş görevler her zaman üstte
    ///   2. Priority  DESC  — Urgent → High → Normal → Low
    ///   3. DueDate   ASC, null'lar sona  — yakın tarihli önce
    ///   4. CreatedAt DESC  — eşitlerde en yeni üste
    /// </summary>
    public IReadOnlyList<Todo> GetAll()
    {
        return dbContext.Todos
            .OrderByDescending(t => t.IsPinned)
            .ThenByDescending(t => t.Priority)
            .ThenBy(t => t.DueDate == null)
            .ThenBy(t => t.DueDate)
            .ThenByDescending(t => t.CreatedAt)
            .ToList()
            .AsReadOnly();
    }

    /// <summary>
    /// Verilen id'ye sahip todo'yu döndürür; bulunamazsa null döner.
    /// </summary>
    public Todo? GetById(Guid id)
    {
        return dbContext.Todos.Find(id);
    }

    /// <summary>
    /// Yeni bir todo oluşturur. Id, CreatedAt, UpdatedAt ve IsCompleted
    /// değerlerini burada atar; IsPinned her zaman false olarak başlar.
    /// Priority, DueDate ve Tags controller'dan gelen todo nesnesiyle taşınır.
    /// </summary>
    public Todo Add(Todo todo)
    {
        todo.Id = Guid.NewGuid();
        todo.CreatedAt = DateTime.UtcNow;
        todo.UpdatedAt = DateTime.UtcNow;
        todo.IsCompleted = false;
        todo.IsPinned = false; // Oluşturma anında pin yok; PATCH /pin ile yapılır.

        dbContext.Todos.Add(todo);
        dbContext.SaveChanges();

        return todo;
    }

    /// <summary>
    /// Verilen id'ye sahip todo'nun alanlarını günceller.
    /// Todo bulunamazsa null döner.
    /// </summary>
    public Todo? Update(Guid id, Todo updated)
    {
        var existing = dbContext.Todos.Find(id);
        if (existing is null) return null;

        existing.Title = updated.Title;
        existing.Description = updated.Description;
        existing.IsCompleted = updated.IsCompleted;
        existing.Priority = updated.Priority;
        existing.DueDate = updated.DueDate;
        existing.IsPinned = updated.IsPinned;
        existing.Tags = updated.Tags;
        existing.UpdatedAt = DateTime.UtcNow;

        dbContext.SaveChanges();

        return existing;
    }

    /// <summary>
    /// Verilen id'ye sahip todo'yu siler.
    /// Başarılıysa true, todo bulunamazsa false döner.
    /// </summary>
    public bool Delete(Guid id)
    {
        var todo = dbContext.Todos.Find(id);
        if (todo is null) return false;

        dbContext.Todos.Remove(todo);
        dbContext.SaveChanges();

        return true;
    }

    /// <summary>
    /// Todo'nun IsCompleted değerini tersine çevirir ve UpdatedAt'ı günceller.
    /// Todo bulunamazsa null döner.
    /// </summary>
    public Todo? ToggleComplete(Guid id)
    {
        var todo = dbContext.Todos.Find(id);
        if (todo is null) return null;

        todo.IsCompleted = !todo.IsCompleted;
        todo.UpdatedAt = DateTime.UtcNow;

        dbContext.SaveChanges();

        return todo;
    }

    /// <summary>
    /// Todo'nun IsPinned değerini tersine çevirir ve UpdatedAt'ı günceller.
    /// Todo bulunamazsa null döner.
    /// </summary>
    public Todo? TogglePin(Guid id)
    {
        var todo = dbContext.Todos.Find(id);
        if (todo is null) return null;

        todo.IsPinned = !todo.IsPinned;
        todo.UpdatedAt = DateTime.UtcNow;

        dbContext.SaveChanges();

        return todo;
    }
}
