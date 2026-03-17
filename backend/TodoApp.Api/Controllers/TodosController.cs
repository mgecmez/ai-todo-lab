using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Services;

namespace TodoApp.Api.Controllers;

[ApiController]
[Route("api/todos")]
[Authorize]
public class TodosController(ITodoService service) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public ActionResult<IEnumerable<Todo>> GetAll()
        => Ok(service.GetAll(CurrentUserId));

    [HttpGet("{id:guid}")]
    public ActionResult<Todo> GetById(Guid id)
    {
        var todo = service.GetById(id, CurrentUserId);
        return todo is null ? NotFound() : Ok(todo);
    }

    [HttpPost]
    public ActionResult<Todo> Create([FromBody] CreateTodoRequest request)
    {
        var created = service.Create(request, CurrentUserId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public ActionResult<Todo> Update(Guid id, [FromBody] UpdateTodoRequest request)
    {
        var result = service.Update(id, request, CurrentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        var deleted = service.Delete(id, CurrentUserId);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/toggle")]
    public ActionResult<Todo> Toggle(Guid id)
    {
        var result = service.ToggleComplete(id, CurrentUserId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}/pin")]
    public ActionResult<Todo> Pin(Guid id)
    {
        var result = service.TogglePin(id, CurrentUserId);
        return result is null ? NotFound() : Ok(result);
    }
}
