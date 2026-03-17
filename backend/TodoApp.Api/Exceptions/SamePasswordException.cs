namespace TodoApp.Api.Exceptions;

public class SamePasswordException : Exception
{
    public SamePasswordException()
        : base("The new password must be different from the current one.")
    {
    }
}
