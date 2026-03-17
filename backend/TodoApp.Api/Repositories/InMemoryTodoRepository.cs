using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories;

public class InMemoryTodoRepository : ITodoRepository
{
    private readonly List<Todo> _todos = [];
    private readonly Lock _lock = new();

    public IReadOnlyList<Todo> GetAll(string userId)
    {
        lock (_lock)
        {
            return _todos.Where(t => t.UserId == userId).ToList().AsReadOnly();
        }
    }

    public Todo? GetById(Guid id, string userId)
    {
        lock (_lock)
        {
            return _todos.FirstOrDefault(t => t.Id == id && t.UserId == userId);
        }
    }

    public Todo Add(Todo todo)
    {
        lock (_lock)
        {
            _todos.Add(todo);
        }

        return todo;
    }

    public Todo? Update(Guid id, string userId, Todo updated)
    {
        lock (_lock)
        {
            var existing = _todos.FirstOrDefault(t => t.Id == id && t.UserId == userId);
            if (existing is null) return null;

            existing.Title = updated.Title;
            existing.Description = updated.Description;
            existing.IsCompleted = updated.IsCompleted;
            existing.Priority = updated.Priority;
            existing.DueDate = updated.DueDate;
            existing.IsPinned = updated.IsPinned;
            existing.Tags = updated.Tags;
            existing.UpdatedAt = updated.UpdatedAt; // TodoService tarafından atanmış değeri kullan

            return existing;
        }
    }

    public bool Delete(Guid id, string userId)
    {
        lock (_lock)
        {
            var todo = _todos.FirstOrDefault(t => t.Id == id && t.UserId == userId);
            if (todo is null) return false;

            _todos.Remove(todo);
            return true;
        }
    }

    public Todo? ToggleComplete(Guid id, string userId)
    {
        lock (_lock)
        {
            var todo = _todos.FirstOrDefault(t => t.Id == id && t.UserId == userId);
            if (todo is null) return null;

            todo.IsCompleted = !todo.IsCompleted;
            todo.UpdatedAt = DateTime.UtcNow;

            return todo;
        }
    }

    public Todo? TogglePin(Guid id, string userId)
    {
        lock (_lock)
        {
            var todo = _todos.FirstOrDefault(t => t.Id == id && t.UserId == userId);
            if (todo is null) return null;

            todo.IsPinned = !todo.IsPinned;
            todo.UpdatedAt = DateTime.UtcNow;

            return todo;
        }
    }
}
