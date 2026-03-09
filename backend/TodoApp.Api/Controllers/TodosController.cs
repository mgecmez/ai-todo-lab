using Microsoft.AspNetCore.Mvc;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Repositories;

namespace TodoApp.Api.Controllers;

[ApiController]
[Route("api/todos")]
public class TodosController(ITodoRepository repository) : ControllerBase
{
    [HttpGet]
    public ActionResult<IEnumerable<Todo>> GetAll()
    {
        // Sıralama EfTodoRepository.GetAll() içinde yapılıyor (TM-005).
        // Buradaki eski .OrderByDescending(t => t.CreatedAt) kaldırıldı.
        return Ok(repository.GetAll());
    }

    [HttpPost]
    public ActionResult<Todo> Create([FromBody] CreateTodoRequest request)
    {
        var todo = new Todo
        {
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority    = (TodoPriority)(request.Priority ?? (int)TodoPriority.Normal),
            DueDate     = request.DueDate,
            Tags        = request.Tags?.Trim(),
            // IsPinned: oluşturma anında her zaman false; PATCH /pin ile değiştirilir.
        };

        var created = repository.Add(todo);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id:guid}")]
    public ActionResult<Todo> GetById(Guid id)
    {
        var todo = repository.GetById(id);
        if (todo is null) return NotFound();

        return Ok(todo);
    }

    [HttpPut("{id:guid}")]
    public ActionResult<Todo> Update(Guid id, [FromBody] UpdateTodoRequest request)
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
        };

        var result = repository.Update(id, updated);
        if (result is null) return NotFound();

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        var deleted = repository.Delete(id);
        if (!deleted) return NotFound();

        return NoContent();
    }

    [HttpPatch("{id:guid}/toggle")]
    public ActionResult<Todo> Toggle(Guid id)
    {
        var result = repository.ToggleComplete(id);
        if (result is null) return NotFound();

        return Ok(result);
    }

    [HttpPatch("{id:guid}/pin")]
    public ActionResult<Todo> Pin(Guid id)
    {
        var result = repository.TogglePin(id);
        if (result is null) return NotFound();

        return Ok(result);
    }
}
