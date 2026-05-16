# Service Level Objectives (SLOs)

Measurement window: rolling 28 days unless otherwise noted.

| SLI | Target | Relevant API surface |
| --- | --- | --- |
| `GET /v1/contracts` p95 latency | < 500 ms | `ContractsController` |
| `GET /v1/runs/{id}` poll p95 latency | < 200 ms | `RunsController.GetRunAsync` |
| AI suggestion p95 latency | < 6 s | AI controller and agents |
| Run completion within 60 s | >= 99% | `RunsController.CreateRunAsync`, engine orchestrator |
| API 5xx rate | < 0.5% per week | All controllers |
| Readiness probe dependencies | Healthy or degraded without process restarts | `/health/ready` |
| Process liveness | 99.9% monthly | `/health/live` |

Error-budget burn alerts should page on sustained 5x burn for critical endpoints and open an incident when the weekly 5xx budget is exhausted.
