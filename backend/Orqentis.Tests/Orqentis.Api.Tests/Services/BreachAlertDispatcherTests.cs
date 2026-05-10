using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Extensibility;
using Microsoft.Extensions.Logging.Abstractions;
using Orqentis.Api.Services;
using Orqentis.Api.Services.Webhooks;
using Orqentis.Data.Entities;

namespace Orqentis.Tests.Orqentis.Api.Tests.Services;

public sealed class BreachAlertDispatcherTests
{
    [Fact]
    public async Task DispatchAsync_UsesActivator_WhenRuleConfigured()
    {
        var activator = new StubActivatorClient();
        var dispatcher = CreateDispatcher(activator: activator);
        var policy = CreatePolicy();
        policy.ActivatorRuleId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");

        var result = await dispatcher.DispatchAsync(new AlertDispatchRequest(
            Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            policy,
            CreateContext(),
            "fabric-token"));

        result.ActivatorTriggered.Should().BeTrue();
        result.Route.Should().Be("activator");
        activator.TriggerCount.Should().Be(1);
    }

    [Fact]
    public async Task DispatchAsync_UsesSlackWebhook_WhenConfigured()
    {
        var slack = new StubSlackWebhookSender();
        var dispatcher = CreateDispatcher(slack: slack);
        var policy = CreatePolicy();
        policy.ActivatorRuleId = null;
        policy.ActionConfigJson = """{"provider":"slack","webhookUrl":"https://hooks.slack.com/services/test"}""";

        var result = await dispatcher.DispatchAsync(new AlertDispatchRequest(
            Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            policy,
            CreateContext(),
            "fabric-token"));

        result.ActivatorTriggered.Should().BeFalse();
        result.Route.Should().Be("slack");
        slack.CallCount.Should().Be(1);
    }

    private static BreachAlertDispatcher CreateDispatcher(
        StubActivatorClient? activator = null,
        StubGenericWebhookSender? generic = null,
        StubSlackWebhookSender? slack = null) =>
        new(
            activator ?? new StubActivatorClient(),
            generic ?? new StubGenericWebhookSender(),
            slack ?? new StubSlackWebhookSender(),
            new TelemetryClient(TelemetryConfiguration.CreateDefault()),
            NullLogger<BreachAlertDispatcher>.Instance);

    private static ActivatorTriggerContext CreateContext() =>
        new(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            "Contract",
            "abfss://table",
            Guid.Parse("22222222-2222-2222-2222-222222222222"),
            "failed",
            80m,
            2,
            "https://app.fabric.microsoft.com/run");

    private static ContractPolicy CreatePolicy() =>
        new()
        {
            PolicyId = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            ContractId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            ActivatorRuleId = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            TriggerEvent = "enforcement.failed",
            ActionType = "notify",
            ActionConfigJson = "{}",
            Enabled = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

    private sealed class StubActivatorClient : IActivatorClient
    {
        public int TriggerCount { get; private set; }

        public Task<IReadOnlyList<ActivatorRuleSummary>> ListRulesAsync(Guid workspaceId, string fabricRestToken, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<ActivatorRuleSummary>>([]);

        public Task TriggerRuleAsync(Guid workspaceId, Guid ruleId, ActivatorTriggerContext context, string fabricRestToken, CancellationToken ct = default)
        {
            TriggerCount++;
            return Task.CompletedTask;
        }
    }

    private sealed class StubGenericWebhookSender : IGenericWebhookSender
    {
        public int CallCount { get; private set; }
        public Task SendAsync(string url, object payload, CancellationToken ct = default)
        {
            CallCount++;
            return Task.CompletedTask;
        }
    }

    private sealed class StubSlackWebhookSender : ISlackWebhookSender
    {
        public int CallCount { get; private set; }
        public Task SendAsync(string url, string text, CancellationToken ct = default)
        {
            CallCount++;
            return Task.CompletedTask;
        }
    }
}
