using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories;

public interface ITodoRepository
{
    IReadOnlyList<Todo> GetAll(string userId);
    Todo? GetById(Guid id, string userId);
    Todo Add(Todo todo);
    Todo? Update(Guid id, string userId, Todo updated);
    bool Delete(Guid id, string userId);
    Todo? ToggleComplete(Guid id, string userId);

    /// <summary>
    /// Todo'nun IsPinned değerini tersine çevirir ve UpdatedAt'ı günceller.
    /// Todo bulunamazsa null döner.
    /// </summary>
    Todo? TogglePin(Guid id, string userId);
}
