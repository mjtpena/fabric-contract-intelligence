namespace Orqentis.Engine.Common;

/// <summary>
/// Result type for expected (non-exceptional) failures throughout the engine.
/// Use this instead of throwing for predictable failure paths so callers can pattern-match.
/// </summary>
public sealed record Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public string? ErrorCode { get; }

    private Result(bool isSuccess, T? value, string? error, string? errorCode)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
        ErrorCode = errorCode;
    }

    public static Result<T> Success(T value) => new(true, value, null, null);

    public static Result<T> Failure(string error, string? errorCode = null) =>
        new(false, default, error, errorCode);
}
