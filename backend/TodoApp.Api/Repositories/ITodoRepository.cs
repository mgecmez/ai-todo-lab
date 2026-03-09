using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories;

public interface ITodoRepository
{
    IReadOnlyList<Todo> GetAll();
    Todo? GetById(Guid id);
    Todo Add(Todo todo);
    Todo? Update(Guid id, Todo updated);
    bool Delete(Guid id);
    Todo? ToggleComplete(Guid id);

    /// <summary>
    /// Todo'nun IsPinned değerini tersine çevirir ve UpdatedAt'ı günceller.
    /// Todo bulunamazsa null döner.
    /// </summary>
    Todo? TogglePin(Guid id);
}
