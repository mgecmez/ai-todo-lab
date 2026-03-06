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
        var todos = repository.GetAll()
            .OrderByDescending(t => t.CreatedAt);

        return Ok(todos);
    }

    [HttpPost]
    public ActionResult<Todo> Create([FromBody] CreateTodoRequest request)
    {
        var todo = new Todo
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
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
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            IsCompleted = request.IsCompleted,
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
}
