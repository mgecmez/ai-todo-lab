using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Repositories;

namespace TodoApp.Api.Services;

/// <summary>
/// ITodoService'in birincil implementasyonu.
/// İş mantığını barındırır; veri erişimini ITodoRepository'ye devreder.
/// </summary>
public class TodoService(ITodoRepository repository) : ITodoService
{
    public IReadOnlyList<Todo> GetAll(string userId) => repository.GetAll(userId);

    public Todo? GetById(Guid id, string userId) => repository.GetById(id, userId);

    public Todo Create(CreateTodoRequest request, string userId)
    {
        var todo = new Todo
        {
            Id          = Guid.NewGuid(),
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority    = (TodoPriority)(request.Priority ?? (int)TodoPriority.Normal),
            DueDate     = request.DueDate,
            Tags        = request.Tags?.Trim(),
            IsCompleted = false,
            IsPinned    = false,
            UserId      = userId,
            CreatedAt   = DateTime.UtcNow,
            UpdatedAt   = DateTime.UtcNow,
        };

        return repository.Add(todo);
    }

    public Todo? Update(Guid id, UpdateTodoRequest request, string userId)
    {
        var updated = new Todo
        {
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            IsCompleted = request.IsCompleted,
            Priority    = (TodoPriority)request.Priority,
            DueDate     = request.DueDate,
            IsPinned    = request.IsPinned,
            Tags        = request.Tags?.Trim(),
            UpdatedAt   = DateTime.UtcNow,
        };

        return repository.Update(id, userId, updated);
    }

    public bool Delete(Guid id, string userId) => repository.Delete(id, userId);

    public Todo? ToggleComplete(Guid id, string userId) => repository.ToggleComplete(id, userId);

    public Todo? TogglePin(Guid id, string userId) => repository.TogglePin(id, userId);
}
