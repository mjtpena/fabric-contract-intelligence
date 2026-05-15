# Orqentis — Investor One-Pager

---

## Company / Product / Tagline

**Orqentis** is a native Microsoft Fabric ISV workload that enforces ODCS v3.1.0 data contracts at the OneLake Delta layer — the one place every Fabric AI agent reads from.

> *Contract-bound data for every AI agent on Microsoft Fabric.*

---

## The Problem

Microsoft Fabric is now the data backbone for enterprise Copilot deployments. Every Fabric Data Agent, Power BI Copilot session, and Copilot Studio skill reads from OneLake Delta tables — and every one of those tables is currently consumed without any machine-verifiable guarantee of schema integrity, data freshness, sensitivity classification, or identity-scoped access. Schema drift silently breaks RAG retrieval. Stale tables produce false-confidence answers. Unlabelled PII columns pass unchecked into agent context windows. When the Copilot answer is wrong, there is no evidence trail showing what the data state was at inference time. This is not an AI model problem. It is a data infrastructure gap — and the EU AI Act (August 2026 enforcement), NIST AI RMF, and OWASP LLM Top 10 2025 all name it as the primary unsolved risk in enterprise AI deployments.[^1][^2][^3]

---

## The Wedge

Three structural advantages that Orqentis owns and no current competitor can replicate:

1. **Fabric-native enforcement.** Orqentis runs as a native Fabric Workload inside the Fabric portal. It reads Delta transaction logs under the calling user's OBO-delegated identity (Azure.Identity `OnBehalfOfCredential`), emits contract breach events as Fabric Business Events into the Real-Time Hub, triggers Activator automation natively, and traverses the tenant lineage graph via the Fabric REST API. External tools cannot do any of these without violating the OBO security model or requiring workspace-level service accounts.[^4]

2. **ODCS v3.1.0 — the open standard, not a proprietary rule engine.** ODCS is maintained by Bitol under the LF AI & Data Foundation (graduated September 2024). Customer contracts are portable YAML — version-controllable in Git, runnable with the open-source Data Contract CLI, and not locked to any vendor. Every competitor (Purview DQ, Collibra, Informatica CLAIRE) enforces contracts in a proprietary DSL. ODCS portability is a genuine procurement differentiator in regulated enterprise deals.[^5]

3. **OBO-delegated enforcement = the only audit trail regulators accept.** Every Orqentis enforcement run records the Delta log version, the breach clause, and the OBO user identity that ran the check. This is the "AI input data quality evidence at time of inference" that EU AI Act Article 10, NIST AI RMF MEASURE, and ISO/IEC 42001 auditors will demand. No other tool produces it. Purview DSPM for AI monitors AI *interactions*, not data-side *contract compliance*.[^6]

---

## The Product — Five Capabilities

| Capability | What it does |
|---|---|
| **Agent-Ready Contract Co-Author** | AI-powered ODCS v3.1.0 authoring from Delta table profile; Monaco editor with IntelliSense in the Fabric portal |
| **AI Blast-Radius Scorer** | Traverses Fabric lineage graph at breach time; severity-ranks every Copilot session, Fabric Data Agent, and Copilot Studio agent grounded on the breached table |
| **Pre-Copilot Contract Gate** | Low-latency Contract Status REST endpoint; tags semantic models `contract-status: BREACH`; blocks or warns Copilot grounding before stale data reaches agents |
| **AI Act Evidence Pack** | One-click PDF/JSON bundle: run history, OBO identity log, MIP labels, Delta log versions, EU AI Act Article 10/13 + NIST AI RMF + ISO 42001 mapping |
| **AI Governance Assistant** | Natural-language governance queries across the full contract estate: "Which contracts are feeding our M365 Copilot?" returns a ranked, actionable list |

---

## Market & Timing

- **EU AI Act** general-purpose AI obligations begin **August 2026**.[^3] Article 10 requires documented data governance for AI training and inference data. Every EU enterprise with a Copilot deployment on Fabric faces this deadline without a native tool to meet it.
- **NIST AI RMF 1.0** (January 2023) + GenAI Profile NIST AI 600-1 (2024) establish the US federal standard.[^2] AI Act, NIST AI RMF, and ISO/IEC 42001:2023 together create a multi-jurisdiction compliance forcing function.
- **Microsoft Copilot adoption** is accelerating across Fabric: Copilot in every Fabric workload (GA), Fabric Data Agents + Copilot Studio integration (Preview, Build 2025), Azure AI Agent Service + Fabric (Preview). The surface area of AI-agent-to-data-table connections is growing faster than the governance layer beneath it.[^4]
- The OWASP LLM Top 10 2025 was produced by a community of 600+ experts across 18+ countries with 8,000+ active members — mainstream enterprise security teams use it as the authoritative LLM risk reference.[^1]
- ODCS v3.1.0 originated at PayPal (2023) and is now a Linux Foundation project. DataContract.com and the Data Contract CLI have created an open ecosystem that Orqentis extends into Fabric natively.[^5]

---

## Competitive Moat

- **No confirmed Fabric-native ISV** for ODCS data contract enforcement, AI blast-radius scoring, or Pre-Copilot contract gating exists in AppSource or the Fabric Workload Hub as of July 2025.[^4]
- **Microsoft is building the AI agent infrastructure, not the contract layer.** Fabric IQ (Preview) is Microsoft's semantic layer play — proprietary ontology format, no ODCS. Purview Data Quality runs on schedules with proprietary rule syntax. The gap is structural and durable (estimated 24+ months before Microsoft could fill it without abandoning Fabric IQ investment).[^4]
- **Pricing vector competitors cannot follow.** Collibra is $150K–$500K+/yr, 6-month implementation. Informatica IDMC is $100K–$500K+/yr (Salesforce acquisition, Microsoft deprioritized). Orqentis at AUD $299/workspace/month on Azure Marketplace is accessible to Fabric Platform Owners without a CIO signature — enabling land-and-expand without enterprise procurement friction.[^7]

---

## Traction / Roadmap

| Milestone | Status |
|---|---|
| ODCS v3.1.0 enforcement engine | ✅ Implemented (`Orqentis.Engine`) |
| Monaco editor + IntelliSense | ✅ Implemented (`frontend/src/monaco/`) |
| OBO-delegated Delta reads | ✅ Implemented (Azure.Identity OBO) |
| Activator integration | ✅ Implemented |
| Fabric Workload SDK | ✅ Implemented |
| AI Act Evidence Pack (PDF/JSON) | ✅ Implemented |
| AI Blast-Radius Scorer | ✅ Implemented |
| Pre-Copilot Contract Gate | ✅ Implemented |
| AI Governance Assistant | ✅ Implemented |
| ISV AppSource / Workload Hub publish | 🔄 In progress (readiness tracked in `docs/isv-publish-checklist.md`) |
| Paid customer logos | TBD |
| Enterprise pilot references | TBD |

---

## Business Model

| Tier | Price | Included |
|---|---|---|
| **Community** | Free | 1 workspace, 20 contracts, manual enforcement |
| **Enterprise** | AUD $299/workspace/month | Unlimited workspaces + contracts, scheduled enforcement, AI contract suggestion, Activator alerting, cross-workspace federation, audit reports (PDF), Purview integration |
| **AI Act Evidence Pack** *(proposed)* | Add-on to Enterprise | Extended evidence bundle: ISO 42001 mapping, EU AI Act Article 13 pack, NIST AI RMF GOVERN mapping, assessor-ready ZIP export |
| **AI Blast-Radius Pro** *(proposed)* | Add-on to Enterprise | Cross-tenant blast-radius (multi-Fabric tenant federation), Microsoft 365 Copilot grounding source integration, Copilot Studio agent inventory |

Distribution: Azure Marketplace / Fabric Workload Hub. Billing via Azure capacity or direct invoicing. No separate infrastructure required — Orqentis runs against the customer's existing Fabric capacity.

---

## Team

| Role | Status |
|---|---|
| Founder / CEO | TBD |
| CTO | TBD |
| Head of Product | TBD |
| Head of Sales (Microsoft ISV) | TBD |

*Advisory board and ISV partner contacts: TBD.*

---

## The Ask

**Seeking:** TBD — Seed round  
**Use of funds:** Product hardening for AppSource launch, first enterprise customer acquisition (Microsoft ISV co-sell motion), hiring Head of Sales and first enterprise Account Executive with existing Microsoft Fabric customer relationships.

*Deck and data room available on request.*

---

[^1]: OWASP LLM Top 10 for Large Language Model Applications 2025, `github.com/OWASP/www-project-top-10-for-large-language-model-applications/tree/main/2_0_vulns`. Community: 600+ experts, 8,000+ active members. See `.artifacts/research/ai-readiness-frameworks.md §1.4`.
[^2]: NIST AI RMF 1.0 (January 2023) and NIST AI 600-1 GenAI Profile (2024), `airc.nist.gov`. See `.artifacts/research/ai-readiness-frameworks.md §1.1`.
[^3]: EU AI Act, Regulation (EU) 2024/1689, 13 June 2024. General-purpose AI obligations begin August 2026. `eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689`. See `.artifacts/research/ai-readiness-frameworks.md §1.2`.
[^4]: Fabric gap analysis: no competing Fabric-native ODCS workload confirmed in AppSource/Workload Hub as of 2026-05. `.artifacts/research/fabric-gap-analysis.md §4.1, §6C, §5`.
[^5]: ODCS v3.1.0, Bitol / LF AI & Data Foundation, graduated sandbox September 2024. `lfaidata.foundation/projects/bitol/`. See `.artifacts/research/ai-readiness-frameworks.md §5`.
[^6]: Purview DSPM for AI limitation confirmed: "Sensitivity labels and DLP are NOT supported for AI interactions with Copilot in Fabric." `.artifacts/research/fabric-gap-analysis.md §1.12`.
[^7]: Competitive pricing benchmarks. `.artifacts/research/competitive-landscape.md §C`.

---

*2025-07-15 UTC*
