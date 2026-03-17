namespace TodoApp.Api.Exceptions;

public class WrongPasswordException : Exception
{
    public WrongPasswordException()
        : base("The provided password is incorrect.")
    {
    }
}
