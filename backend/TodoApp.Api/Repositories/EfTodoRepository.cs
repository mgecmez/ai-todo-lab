using Microsoft.EntityFrameworkCore;
using TodoApp.Api.Data;
using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories;

/// <summary>
/// ITodoRepository'nin EF Core + SQLite implementasyonu.
/// InMemoryTodoRepository ile birebir aynı davranışı korur;
/// lock mekanizması yerine EF Core'un Scoped DbContext izolasyonuna dayanır.
///
/// Not: ITodoRepository imzaları senkron olduğundan EF Core'un senkron
/// API'leri (SaveChanges, Find, ToList…) kullanılmaktadır.
/// </summary>
public class EfTodoRepository(AppDbContext dbContext) : ITodoRepository
{
    /// <summary>
    /// Tüm todo'ları oluşturulma tarihine göre yeniden eskiye sıralar.
    /// TodosController'daki sıralama mantığıyla örtüşür.
    /// </summary>
    public IReadOnlyList<Todo> GetAll()
    {
        return dbContext.Todos
            .OrderByDescending(t => t.CreatedAt)
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
    /// değerlerini burada atar; controller veya dış katman bu alanları set etmez.
    /// </summary>
    public Todo Add(Todo todo)
    {
        todo.Id = Guid.NewGuid();
        todo.CreatedAt = DateTime.UtcNow;
        todo.UpdatedAt = DateTime.UtcNow;
        todo.IsCompleted = false;

        dbContext.Todos.Add(todo);
        dbContext.SaveChanges();

        return todo;
    }

    /// <summary>
    /// Verilen id'ye sahip todo'nun Title, Description ve IsCompleted alanlarını günceller.
    /// Todo bulunamazsa null döner.
    /// </summary>
    public Todo? Update(Guid id, Todo updated)
    {
        var existing = dbContext.Todos.Find(id);
        if (existing is null) return null;

        existing.Title = updated.Title;
        existing.Description = updated.Description;
        existing.IsCompleted = updated.IsCompleted;
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
}
