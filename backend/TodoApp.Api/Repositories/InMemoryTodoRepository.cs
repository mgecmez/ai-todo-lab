using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories;

public class InMemoryTodoRepository : ITodoRepository
{
    private readonly List<Todo> _todos = [];
    private readonly Lock _lock = new();

    public IReadOnlyList<Todo> GetAll()
    {
        lock (_lock)
        {
            return _todos.ToList().AsReadOnly();
        }
    }

    public Todo? GetById(Guid id)
    {
        lock (_lock)
        {
            return _todos.FirstOrDefault(t => t.Id == id);
        }
    }

    public Todo Add(Todo todo)
    {
        todo.Id = Guid.NewGuid();
        todo.CreatedAt = DateTime.UtcNow;
        todo.UpdatedAt = DateTime.UtcNow;
        todo.IsCompleted = false;

        lock (_lock)
        {
            _todos.Add(todo);
        }

        return todo;
    }

    public Todo? Update(Guid id, Todo updated)
    {
        lock (_lock)
        {
            var existing = _todos.FirstOrDefault(t => t.Id == id);
            if (existing is null) return null;

            existing.Title = updated.Title;
            existing.Description = updated.Description;
            existing.IsCompleted = updated.IsCompleted;
            existing.UpdatedAt = DateTime.UtcNow;

            return existing;
        }
    }

    public bool Delete(Guid id)
    {
        lock (_lock)
        {
            var todo = _todos.FirstOrDefault(t => t.Id == id);
            if (todo is null) return false;

            _todos.Remove(todo);
            return true;
        }
    }

    public Todo? ToggleComplete(Guid id)
    {
        lock (_lock)
        {
            var todo = _todos.FirstOrDefault(t => t.Id == id);
            if (todo is null) return null;

            todo.IsCompleted = !todo.IsCompleted;
            todo.UpdatedAt = DateTime.UtcNow;

            return todo;
        }
    }

    // Stub — InMemoryTodoRepository aktif olarak kullanılmıyor (EfTodoRepository geçerli).
    // Gerçek implementasyon TM-005'te EfTodoRepository üzerinde yapılacak.
    public Todo? TogglePin(Guid id) => throw new NotImplementedException();
}
