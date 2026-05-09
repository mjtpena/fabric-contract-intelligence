using FluentAssertions;
using Xunit;

namespace Orqentis.Tests;

/// <summary>Sanity-check test that wires the engine and asserts a stub fail-path returns Error.</summary>
public sealed class ScaffoldSanityTests
{
    [Fact]
    public void Result_Failure_carries_error()
    {
        var r = global::Orqentis.Engine.Common.Result<int>.Failure("nope", "X");
        r.IsSuccess.Should().BeFalse();
        r.Error.Should().Be("nope");
        r.ErrorCode.Should().Be("X");
    }
}
