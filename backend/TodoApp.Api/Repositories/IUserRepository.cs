using TodoApp.Api.Models;

namespace TodoApp.Api.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User> AddAsync(User user);
    Task<User?> GetByIdAsync(Guid userId);
    Task<User> UpdateAsync(User user);
    Task DeleteAsync(Guid userId);
}
