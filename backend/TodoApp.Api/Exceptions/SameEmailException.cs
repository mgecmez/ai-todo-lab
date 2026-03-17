namespace TodoApp.Api.Exceptions;

public class SameEmailException : Exception
{
    public SameEmailException()
        : base("The new email address is the same as the current one.")
    {
    }
}
