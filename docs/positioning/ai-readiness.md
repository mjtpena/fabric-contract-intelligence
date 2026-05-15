# Orqentis AI Readiness Narrative

> **Contract-bound data for every AI agent on Microsoft Fabric.**

---

## The Problem in Three Paragraphs

Enterprise AI agents on Microsoft Fabric — Copilot in Power BI, Fabric Data Agents, Copilot Studio agents, custom RAG pipelines hitting OneLake — inherit every defect of the Delta tables they consume. Schema drift silently breaks retrieval. Tables last refreshed 90 days ago look identical to tables refreshed 90 seconds ago. Columns carrying PII, PHI, or confidential IP pass unchecked into agent context windows. None of these are model failures. They are data infrastructure failures — and they produce the same harmful output: wrong answers delivered with false confidence.

Microsoft has built Copilot into every Fabric workload. Fabric Data Agents now integrate with Copilot Studio and Azure AI Agent Service. Microsoft 365 Copilot grounds on Power BI semantic models that sit on top of OneLake lakehouses. The surface area is growing faster than the governance layer beneath it. Microsoft Purview monitors AI *interactions* — what leaves an agent — but nothing in the Fabric platform verifies whether the grounding data *deserves to be consumed* before the agent reads it.[^1] The result: six broken promises that every Fabric AI deployment is quietly making to its business stakeholders, regulators, and end users.

Those six broken promises are not hypothetical. OWASP LLM08:2025 documents vector store contamination from unvalidated source tables.[^2] NIST AI 600-1 names "confabulation" caused by stale retrieval data as a primary GenAI risk.[^3] EU AI Act Article 10 creates a legal obligation for high-risk AI systems to operate on data that is "sufficiently representative... free of errors and complete" — covering any retrieval used at inference time.[^4] ISO/IEC 42001:2023 mandates traceability and transparency for AI systems in every regulated industry.[^5] The compliance framework is in place. What is missing is the enforcement layer.

---

## The Six Broken Promises

| # | Promise Made | What Actually Breaks | Framework Anchor |
|---|---|---|---|
| 1 | "Copilot knows your data" | Schema drift silently degrades RAG retrieval and Copilot code completions | OWASP LLM08:2025; NIST AI RMF MEASURE |
| 2 | "The answer is current" | No freshness signal at the Delta layer; stale tables produce false-confidence answers | NIST AI 600-1; EU AI Act Art. 10 |
| 3 | "Sensitive data stays protected" | Unlabelled PII/PHI columns pass into agent prompt context wholesale | OWASP LLM02:2025; Microsoft Purview DSPM for AI |
| 4 | "The agent only sees what you can see" | Copilot Studio agents using service-principal identity bypass user OBO scope | OWASP LLM06:2025 (Excessive Permissions) |
| 5 | "We can trace why the agent was wrong" | Fabric lineage shows connections, not the contractual data state at inference time | NIST AI RMF GOVERN; ISO/IEC 42001; Microsoft Responsible AI |
| 6 | "Our RAG knowledge base is clean" | Embeddings from unvalidated Delta tables encode every schema defect permanently | OWASP LLM08:2025; OWASP LLM03:2025 |

---

## Who Feels This Pain

### Chief Data Officer
**Fear:** "AI agents are exposing data we thought was governed. A Copilot-generated board report was wrong and nobody knew until the CFO challenged it."

The CDO has invested in Microsoft Purview for sensitivity labels and data lineage. Those tools tell the organization *what* data exists and *who* can access it. They do not tell the CDO whether the data *meets contractual quality standards* before an AI agent touches it. The CDO needs a machine-enforceable contract between data producers and AI consumers — not a policy document, not an advisory badge, not a scheduled quality scan that runs at 3 a.m.

**What they buy:** A governance instrument that proves, with a timestamped audit trail, that every AI-consumed table met its contractual schema, freshness, and quality obligations at the moment of consumption.

---

### Chief AI Officer
**Fear:** "Our AI outputs are unreliable and I cannot explain why to the board. When the audit comes, I have no evidence that the data inputs were sound."

The CAIO is responsible for AI reliability and has signed off on AI Act compliance frameworks without having any tool that produces per-dataset, per-inference-run evidence of data quality. The gap between "we have a governance policy" and "we can prove contractual compliance at inference time" is where regulatory exposure lives.

**What they buy:** An inference-time audit trail and contract-status evidence pack that survives a regulatory examination under EU AI Act Article 13 and NIST AI RMF MEASURE.

---

### Head of Data Governance
**Fear:** "EU AI Act Article 10 is not a theoretical obligation. It lands on my desk in August 2026 and I have 400 Delta tables feeding AI agents with no documented quality contracts."

Manual sensitivity labelling cannot scale to hundreds of tables. Purview Data Quality runs proprietary rule syntax on a schedule — it is not connected to the AI agent consumption pipeline and cannot produce ODCS-format breach evidence. The governance leader needs a standard, not a tool that creates new proprietary lock-in.

**What they buy:** ODCS v3.1.0 — an open, Linux Foundation-maintained standard[^6] — with AI-powered contract suggestion, column-level classification enforcement, and a compliance evidence pack formatted for regulators.

---

### Fabric Platform Owner
**Fear:** "Agents are consuming Fabric CU capacity in unpredictable spikes and I cannot trace which uncontrolled dataset is the root cause. Some agent scanned an entire Delta table."

The platform owner manages Fabric capacity and workspace governance. Over-permissioned agents reading full Delta table scans without row or column constraints are both a data security risk (OWASP LLM06:2025 Excessive Permissions)[^2] and a FinOps problem (OWASP LLM10:2025 Unbounded Consumption).[^2]

**What they buy:** Access-scoped contract enforcement that limits agent reads to contracted columns and row filters, plus AI Blast-Radius Scorer output that attributes Fabric CU consumption to contracted versus uncontrolled agent reads.

---

### AI Security Lead
**Fear:** "A ConfusedPilot-style prompt injection via a poisoned Delta table will compromise our Copilot deployment before we see it coming. Our RAG knowledge base was built from tables we never validated."

The ConfusedPilot attack demonstrated RAG poisoning against Microsoft 365 Copilot specifically. The OWASP Agentic Security Initiative's 2025 threat taxonomy lists memory poisoning and data poisoning as primary agentic threat vectors.[^7] Microsoft's own AI Red Team taxonomy identifies that the absence of external validation mechanisms for memory/context inputs is the structural mitigant gap.[^8]

**What they buy:** A pre-ingestion quality gate for RAG pipelines, adversarial content schema rules, and vector store validation — ensuring that only contract-compliant, freshness-verified, sensitivity-classified data ever enters the embedding pipeline.

---

## What Orqentis Does — Five Capabilities

### 1. Agent-Ready Contract Co-Author
The AI-powered ODCS v3.1.0 contract authoring environment embedded natively inside the Microsoft Fabric portal. A data engineer opens a Lakehouse item, selects a Delta table, and Orqentis profiles the Delta log metadata — inferred schema, column statistics, historical freshness patterns, detected PII columns — to generate a starter ODCS contract with quality rules, SLA fields, and sensitivity classifications pre-populated. The Monaco editor provides full IntelliSense for ODCS v3.1.0 schema, with real-time JSON Schema validation and a green/red contract health indicator on save.

**NIST/OWASP mapping:** NIST AI RMF GOVERN function (organizational roles and responsibilities for AI data quality); addresses root causes of Broken Promises 1–3.

**Primary buyer:** Head of Data Governance, Fabric Platform Owner.

---

### 2. AI Blast-Radius Scorer
When a contract enforcement run detects a breach — schema drift, missed freshness SLA, quality-rule failure — the AI Blast-Radius Scorer traverses the Fabric lineage graph (via OBO-delegated Fabric REST API calls) to identify every downstream consumer that is actively grounded on the breached table: Power BI reports, Power BI Copilot semantic models, Fabric Data Agents, Copilot Studio agents, Microsoft 365 Copilot grounding sources, and Azure AI Foundry pipelines. Each consumer is scored by severity — how many active users depend on it, how recently it was queried, and whether it feeds regulated reporting.

**NIST/OWASP mapping:** NIST AI RMF MAP function (AI risk identification and impact assessment); OWASP LLM08:2025 (blast-radius of poisoned source tables).

**Primary buyer:** Chief AI Officer, Chief Data Officer.

---

### 3. Pre-Copilot Contract Gate
A contract-status check that fires before grounding data is served to any Fabric AI agent or Copilot session. Orqentis exposes a low-latency Contract Status REST endpoint — callable from Power BI semantic model metadata, Fabric Data Agent tool definitions, and Copilot Studio agent pre-call hooks — that returns the current pass/fail/breach state of every ODCS contract bound to the requested table, including the specific clause in breach, the Delta log version at breach time, and the OBO identity under which the read was attempted. A semantic model with a failing contract can be tagged `contract-status: BREACH`, which Copilot grounding logic treats as a soft warning or hard block depending on configured policy.

**NIST/OWASP mapping:** NIST AI RMF MEASURE function (real-time data quality metrics at inference time); OWASP LLM02:2025 and LLM06:2025 (preventing sensitive and over-permissioned data from entering agent context).

**Primary buyer:** Chief AI Officer, AI Security Lead.

---

### 4. AI Act Evidence Pack
A one-click compliance bundle that packages every enforcement run record — schema diff, freshness check, quality rule pass/fail, result JSON, OBO identity log, MIP label state, Delta log version, downstream consumer list from the blast-radius graph — into a structured, assessor-ready PDF and JSON artifact. The pack maps each enforcement event to the specific regulatory obligation it satisfies: EU AI Act Article 10 (data governance), Article 13 (transparency), NIST AI RMF GOVERN and MEASURE functions, ISO/IEC 42001:2023 traceability controls, and Microsoft Responsible AI Standard v2 Accountability principle. Evidence packs are stored as Lakehouse artifacts in OneLake and are queryable by audit date range.

**NIST/OWASP mapping:** NIST AI RMF GOVERN (accountability); ISO/IEC 42001:2023 (traceability and transparency); EU AI Act Articles 10, 13.

**Primary buyer:** Head of Data Governance, Chief AI Officer.

---

### 5. AI Governance Assistant
The natural-language governance interface for the Orqentis contract estate. Platform owners and governance leads ask questions in plain English — "Which contracts are feeding our Microsoft 365 Copilot grounding sources?", "Which tables have no active contracts and are being read by AI agents?", "Show me all freshness breaches in the Finance domain in the last 30 days" — and receive structured, ranked answers drawn from the live contract registry, enforcement run history, and lineage graph. The AI Governance Assistant also surfaces recommended next actions: which tables need contracts authored, which breaches are recurring, and which AI consumers should be gated pending contract repair.

**NIST/OWASP mapping:** NIST AI RMF MANAGE function (risk response and monitoring); supports ongoing GOVERN obligations for data stewards.

**Primary buyer:** Head of Data Governance, Fabric Platform Owner.

---

## Why Native to Fabric Matters — The "Only on Fabric" Wedge

Collibra, Informatica, Monte Carlo, and Atlan can build data governance tools that connect to Fabric. None of them can do what Orqentis does natively, because none of them are Fabric Workloads with OBO delegation.[^9]

**OBO-delegated Delta log reads.** Orqentis reads the Delta transaction log (`_delta_log/*.json`) directly from OneLake under the *calling user's delegated identity* — not a service account. This is the only architecture that respects Fabric's OBO security model for AI agents (the OWASP LLM06:2025 Excessive Permissions mitigation[^2]) and produces an audit trail that names the specific identity under which each schema, freshness, and quality check ran. External tools must use service-account access, breaking the identity chain.

**MIP label ↔ contract binding.** Orqentis maps Microsoft Information Protection sensitivity labels applied to Fabric items to required ODCS contract obligations. A "Confidential" label on a Lakehouse table triggers an automatic contract-compliance check before any AI agent queries it. When the contract is in breach, Orqentis can invoke Fabric's Protection Policy API to restrict access until the contract is repaired. No external catalog can modify OneLake security roles without workspace-level credentials that break the delegated-identity model.

**Contract breach → Activator triggers.** Orqentis emits ODCS contract breach events as native Fabric Business Events into the Fabric Real-Time Hub. Customers configure Activator rules — quarantine pipeline triggers, Teams notifications to data stewards, automatic semantic model refresh blocks — using the standard Activator no-code interface. No external data observability tool can emit first-class Business Events into the Fabric Real-Time Hub; they can only send webhooks to external endpoints.

**Fabric REST control-plane access.** As a native Fabric Workload, Orqentis calls the Fabric REST API (lineage graph, workspace item inventory, impact analysis) using the workload's OBO-granted service principal — which the customer authorises once during installation. This is what powers AI Blast-Radius Scorer: traversing the tenant lineage graph at breach time to find every downstream Copilot grounding source and AI agent consumer. External tools require per-workspace API access grants and cannot traverse the full tenant graph.

**Semantic Model TMDL inspection.** Orqentis reads Tabular Model Definition Language (TMDL) metadata from Power BI Semantic Models via OBO-delegated credentials to verify that the model's source tables have passing contracts before Copilot for Power BI grounds on them. This is the architectural foundation of Pre-Copilot Contract Gate for Power BI. No tool outside the Fabric Workload platform can access TMDL metadata via OBO delegation.

---

## What Orqentis Is NOT

**Orqentis is not Microsoft Purview.** Purview governs *who can access what data* and *what sensitivity labels are applied*. Orqentis governs *whether data meets contractual schema, quality, and freshness obligations before AI agents consume it*. The two are complementary: Purview is the identity and classification plane; Orqentis is the contract enforcement plane. They share the same OneLake estate and Fabric portal; they own different problems.

**Orqentis is not a DSPM (Data Security Posture Management) tool.** DSPM tools discover sensitive data across cloud storage and assess exposure risk. Orqentis does not discover sensitive data — it enforces contracts on data that data producers have already defined and classified. If your tables are unlabelled, use Purview DSPM for AI to classify them, then use Orqentis to enforce quality and freshness contracts on them.

**Orqentis is not a runtime LLM firewall.** Tools like Lakera, HiddenLayer, and F5 AI Guardrails inspect prompt inputs and LLM outputs in real time for injection attacks, jailbreaks, and data leakage. Orqentis operates at the *data layer*, before any prompt is constructed. These are complementary layers of the AI security stack: Orqentis certifies the data before it enters the pipeline; LLM guardrails protect the pipeline itself.

**Orqentis is not a data catalog.** Atlan, Alation, and Collibra build rich metadata graphs that give AI agents contextual understanding of what data means. Orqentis enforces what data *must satisfy* before AI agents consume it. Context and contracts are different primitives; both are needed.

**Orqentis is not a data observability tool.** Monte Carlo, Soda, and Great Expectations detect anomalies and alert on data quality degradation. Orqentis enforces contracts — a proactive, pre-consumption gate — rather than detecting violations after the fact. Observability is reactive; Orqentis is prescriptive.

---

[^1]: Microsoft Learn, "Copilot in Microsoft Fabric — Privacy and Security," `learn.microsoft.com/fabric/get-started/copilot-privacy-security`, accessed 2026-05. Gap confirmed: no pre-Copilot contract verification exists in the Fabric platform. See `.artifacts/research/fabric-gap-analysis.md §1.7`.
[^2]: OWASP GenAI Security Project, LLM Top 10 for Large Language Model Applications 2025, `github.com/OWASP/www-project-top-10-for-large-language-model-applications/tree/main/2_0_vulns`, accessed June 2025. See `.artifacts/research/ai-readiness-frameworks.md §1.4`.
[^3]: NIST AI 600-1, Generative AI Profile, `nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf`, accessed June 2025. See `.artifacts/research/ai-readiness-frameworks.md §1.1`.
[^4]: EU AI Act, Regulation (EU) 2024/1689, Article 10, `eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689`, accessed June 2025. See `.artifacts/research/ai-readiness-frameworks.md §1.2`.
[^5]: ISO/IEC 42001:2023, `iso.org/standard/81230.html`, accessed June 2025. See `.artifacts/research/ai-readiness-frameworks.md §1.3`.
[^6]: Bitol / ODCS, LF AI & Data Foundation, `lfaidata.foundation/projects/bitol/`, graduated from sandbox September 2024. ODCS v3.1.0 specification at `bitol-io.github.io/open-data-contract-standard/latest/`. See `.artifacts/research/ai-readiness-frameworks.md §5`.
[^7]: OWASP Agentic Security Initiative, "Agentic AI Threats & Mitigations," `genai.owasp.org/initiatives/agentic-ai-threats-and-mitigations/`, accessed June 2025. See `.artifacts/research/ai-readiness-frameworks.md §1.5`.
[^8]: Microsoft Security Blog, "New whitepaper outlines the taxonomy of failure modes in AI agents," April 2025, `microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/`. See `.artifacts/research/ai-readiness-frameworks.md §1.7`.
[^9]: Fabric ISV workload whitespace confirmed: no competing Fabric-native ODCS enforcement workload found in AppSource or Workload Hub as of 2026-05. See `.artifacts/research/fabric-gap-analysis.md §4.1` and `§6C`.

---

*2025-07-15 UTC*
