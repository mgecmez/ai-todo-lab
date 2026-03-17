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
}
