using Microsoft.EntityFrameworkCore;
using TodoApp.Api.Data;
using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories;

public class EfUserRepository(AppDbContext dbContext) : IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email)
    {
        var normalized = email.ToLowerInvariant();
        return await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalized);
    }

    public async Task<User> AddAsync(User user)
    {
        await dbContext.Users.AddAsync(user);
        await dbContext.SaveChangesAsync();
        return user;
    }

    public async Task<User?> GetByIdAsync(Guid userId)
    {
        return await dbContext.Users.FindAsync(userId);
    }

    public async Task<User> UpdateAsync(User user)
    {
        dbContext.Users.Update(user);
        await dbContext.SaveChangesAsync();
        return user;
    }

    public async Task DeleteAsync(Guid userId)
    {
        var userIdStr = userId.ToString();
        var now = DateTime.UtcNow;

        var todos = await dbContext.Todos
            .Where(t => t.UserId == userIdStr)
            .ToListAsync();

        foreach (var todo in todos)
        {
            todo.IsDeleted = true;
            todo.DeletedAt = now;
        }

        var user = await dbContext.Users.FindAsync(userId);
        if (user is not null)
        {
            user.IsDeleted = true;
            user.DeletedAt = now;
        }

        await dbContext.SaveChangesAsync();
    }
}
