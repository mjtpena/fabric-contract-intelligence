# Orqentis Competitive Matrix
## AI Readiness & Data Security for AI Agents on Microsoft Fabric

> **How to read this table:** ✅ = capability is present and production-grade. 🟡 = partial, preview, or requires significant configuration. ❌ = capability is absent or out of scope. Footnotes cite the research artifact and, where available, the source URL.

---

## Capability Matrix

| Capability | **Orqentis** | Microsoft Purview (incl. DSPM for AI) | Informatica IDMC | Collibra AI Governance | Atlan | Monte Carlo | Securiti Gencore | Immuta | Lakera / Protect AI |
|---|---|---|---|---|---|---|---|---|---|
| **ODCS v3.1.0 native** | ✅ Core standard[^r1] | ❌ Proprietary Purview DQ rule syntax only[^r2] | ❌ No ODCS support[^r3] | ❌ Business-glossary policies, not ODCS[^r4] | ❌ Active metadata, not ODCS contracts[^r5] | ❌ Observability rules, not ODCS[^r6] | ❌ Data Command Graph, not ODCS[^r7] | ❌ ABAC policies, not ODCS schema contracts[^r8] | ❌ Model/prompt security, no ODCS[^r9] |
| **Fabric-native UI** | ✅ Native Workload — runs inside Fabric portal[^r10] | 🟡 Purview Hub embedded (governance reporting only, not enforcement)[^r2] | ❌ Salesforce acquisition; no Fabric Workload[^r3] | ❌ External catalog; API integration only[^r4] | ❌ External catalog; no Fabric Workload confirmed[^r5] | ❌ No Fabric native integration confirmed[^r6] | ❌ No Fabric Workload[^r7] | 🟡 Purview catalog integration (Preview)[^r8] | ❌ API-based; no Fabric portal presence[^r9] |
| **Delta-log enforcement** | ✅ OBO-delegated reads of `_delta_log/*.json` at enforcement time[^r10] | ❌ Purview DQ scans Parquet on schedule (hourly minimum); not Delta-log native[^r2] | ❌ Pipeline-time DQ validation only[^r3] | ❌ Policy agreements, not Delta-layer enforcement[^r4] | ❌ Metadata layer; no Delta-log reads[^r5] | ❌ Anomaly detection via SQL queries, not Delta log[^r6] | ❌ No Delta-log enforcement; unstructured focus[^r7] | 🟡 Enforces at SQL/API query layer; not Delta-log native[^r8] | ❌ Prompt/model security; no Delta-log access[^r9] |
| **OBO delegated reads** | ✅ Azure.Identity OnBehalfOfCredential for all Delta reads — user identity preserved in audit trail[^r10] | ❌ Purview Managed Identity only for DQ scans; no per-user OBO for enforcement[^r2] | ❌ Service principal access; no OBO pattern[^r3] | ❌ No OBO support for Fabric[^r4] | ❌ No OBO support confirmed[^r5] | ❌ No OBO support[^r6] | ❌ No OBO support for Fabric[^r7] | 🟡 User-identity enforcement at query layer; OBO specifics unverified for Fabric[^r8] | ❌ No Fabric OBO access[^r9] |
| **Pre-Copilot contract gate** | ✅ Contract Status REST endpoint; semantic model TMDL inspection; policy-based grounding block[^r10] | ❌ DSPM monitors prompts/responses *after* grounding; no pre-flight contract check[^r2] | ❌ Not applicable[^r3] | ❌ Not applicable[^r4] | ❌ Metadata context, not pre-grounding enforcement[^r5] | ❌ Not applicable[^r6] | ❌ LLM firewall (response-side) not pre-Copilot data gate[^r7] | ❌ Not applicable[^r8] | ❌ Prompt/model security; no Copilot grounding gate[^r9] |
| **AI blast-radius scoring** | ✅ Lineage graph traversal via Fabric REST API; downstream AI consumer severity ranking[^r10] | ❌ Purview Impact Analysis shows structural dependencies; no AI-consumer blast-radius scoring[^r2] | ❌ Not applicable[^r3] | ❌ Not applicable[^r4] | 🟡 Lineage available; no AI blast-radius scoring[^r5] | 🟡 Full lineage to AI consumption; no contract-breach blast-radius[^r6] | ❌ Not applicable[^r7] | ❌ Access-focused impact, not contract-breach AI blast-radius[^r8] | ❌ Not applicable[^r9] |
| **Contract → Activator triggers** | ✅ ODCS breach events emitted as Fabric Business Events into Real-Time Hub; Activator native[^r10] | ❌ No ODCS contract runtime to emit events; Purview DQ alerts go to email only[^r2] | ❌ Not applicable[^r3] | ❌ Not applicable[^r4] | ❌ Not applicable[^r5] | ❌ Alerting via webhook/email; not Fabric Business Events[^r6] | ❌ Not applicable[^r7] | ❌ Not applicable[^r8] | ❌ Not applicable[^r9] |
| **MIP label binding** | ✅ Label-to-contract binding; contract breach triggers Fabric Protection Policy check[^r10] | 🟡 Labels applied to Fabric items; no contract-obligation semantics on labels[^r2] | ❌ No MIP integration[^r3] | ❌ No MIP label contract binding[^r4] | ❌ No MIP label binding[^r5] | ❌ No MIP label binding[^r6] | 🟡 Copilot Readiness Assessment references M365 labeling; no Delta-layer MIP-contract binding[^r7] | 🟡 MIP label integration via catalog; no contract-breach trigger[^r8] | ❌ No MIP label binding[^r9] |
| **AI Act evidence pack** | ✅ Structured PDF/JSON bundle: run history, OBO identity log, MIP labels, NIST/EU AI Act mapping[^r10] | 🟡 Compliance Manager provides control templates; no per-asset per-inference evidence bundle[^r2] | ❌ No AI Act–formatted evidence output[^r3] | ❌ AI governance framework advisory; no automated evidence pack[^r4] | ❌ No compliance evidence generation[^r5] | ❌ No AI Act evidence pack[^r6] | 🟡 Compliance presets (GDPR, HIPAA, EU AI Act); no per-inference contract-breach evidence[^r7] | ❌ No AI Act evidence pack[^r8] | ❌ No AI Act evidence pack[^r9] |
| **Cross-workspace federation** | ✅ Enterprise tier: contract policies federated across workspaces by Fabric domain[^r11] | 🟡 Domain-level DLP delegation; no ODCS contract federation[^r2] | 🟡 Tenant-wide IDMC estate; post-Salesforce Fabric strategy unclear[^r3] | 🟡 Tenant-wide catalog; no Fabric-native federation[^r4] | 🟡 Tenant-wide catalog; no Fabric Workload[^r5] | ❌ No cross-workspace contract federation[^r6] | ❌ Not applicable[^r7] | 🟡 Platform-wide policy; Fabric workspace federation unverified[^r8] | ❌ Not applicable[^r9] |
| **Semantic model freshness gating** | ✅ TMDL inspection via OBO; Pre-Copilot Contract Gate blocks stale semantic model grounding[^r10] | ❌ Purview DQ does not inspect semantic model source freshness before Copilot grounding[^r2] | ❌ Not applicable[^r3] | ❌ Not applicable[^r4] | ❌ Not applicable[^r5] | ❌ Not applicable[^r6] | ❌ Not applicable[^r7] | ❌ Not applicable[^r8] | ❌ Not applicable[^r9] |
| **Open standard (vs proprietary)** | ✅ ODCS v3.1.0 — LF AI & Data Foundation, Bitol project, MIT-licensed YAML[^r12] | ❌ Proprietary Purview DQ rule syntax; Fabric IQ proprietary ontology format[^r2] | ❌ Proprietary CLAIRE rule engine; IPU consumption model[^r3] | ❌ Proprietary business glossary + policy DSL[^r4] | ❌ Proprietary active metadata platform[^r5] | ❌ Proprietary Monte Carlo anomaly rules[^r6] | ❌ Proprietary Data Command Graph[^r7] | ❌ Proprietary ABAC policy engine[^r8] | ❌ Proprietary guardrail/model-scan stack[^r9] |
| **Time-to-first-contract** | ✅ Hours — Agent-Ready Contract Co-Author generates ODCS draft from Delta table profile in Fabric portal[^r10] | 🟡 Days — Purview DQ rule configuration requires Purview portal, scan setup, schema registration | ❌ Weeks–months — IDMC implementation engagement required[^r3] | ❌ Months — Collibra enterprise onboarding cycle 3–6 months[^r4] | 🟡 Days–weeks — catalog onboarding; no contract authoring[^r5] | 🟡 Hours — data source connection; no contract authoring, observability only[^r6] | 🟡 Days — Gencore AI pipeline setup[^r7] | ❌ Weeks — ABAC policy authoring for Fabric (Preview)[^r8] | ❌ Not applicable[^r9] |
| **Pricing transparency** | ✅ Community: free (1 workspace, 20 contracts). Enterprise: AUD $299/workspace/mo. Azure Marketplace.[^r11] | 🟡 Bundled in M365 E3/E5; DSPM for AI requires Purview compliance add-on ~$7/user/mo est.[^r13] | ❌ IPU consumption-based; enterprise contracts $100K–$500K+/yr[^r3] | ❌ Enterprise only; $150K–$500K+/yr est.[^r4] | ❌ Enterprise-demo-only; $80K–$250K+/yr est.[^r5] | ❌ SaaS; $50K–$250K+/yr est.[^r6] | ❌ Enterprise SaaS; pricing undisclosed[^r7] | ❌ Enterprise; $150K–$500K+/yr est.[^r8] | ❌ Enterprise SaaS; pricing undisclosed[^r9] |

---

## How We Lose — An Intellectually Honest Assessment

**Microsoft Purview** wins when the deal is framed as "expand existing Purview investment." Every Fabric Enterprise customer already has Purview. The CDO's first call will be to their Microsoft account team, not to an ISV marketplace listing. Purview's DSPM for AI, sensitivity labels, and DLP cover AI interaction monitoring that Orqentis does not. If the buyer sees data governance as "a Microsoft platform problem solved by Microsoft tools," Orqentis loses before the demo. Orqentis must frame itself as the contract enforcement layer *beneath* Purview — not a replacement for it.

**Immuta** wins when the buying center is security-and-compliance rather than data engineering. Immuta has mature ABAC enterprise references (JPMorgan Chase, IRS), a deployed platform at scale, and pricing conversations that a large enterprise security team has already had. If the contract enforcement requirement is reframed as "access policy enforcement for AI agents," Immuta can satisfy it with their existing ABAC engine plus a Fabric connector upgrade. Orqentis's defense: ODCS open standard (vs. Immuta proprietary policy DSL), OBO-identity contract audit trail, and breach evidence depth.

**Atlan** wins when the buyer is building a company-wide AI data catalog initiative and wants a Forrester Wave Leader with Mastercard and Nasdaq as reference logos. Atlan's "Context Layer for AI" narrative is compelling for AI platform builders who want rich metadata propagated to agent tools. Orqentis has no catalog depth, no business glossary, and no semantic enrichment. If the buyer needs catalog + contracts, Orqentis may need Atlan as a partner, not a competitor.

**Soda** wins when the buyer is a developer-led data team that wants YAML-based data quality checks alongside their dbt/Spark workflow and has no Microsoft Fabric commitment. Soda Core is open-source (20M+ downloads), freely adoptable, and has frontier AI research backing. If the team is Databricks-first or Snowflake-first and is not committed to Fabric, Orqentis has nothing to offer. Orqentis is Fabric-native by design — that is its moat and its constraint.

**Informatica/Collibra** win when the buyer has a multi-year enterprise data management programme, a 30-person data governance team, and a $500K discretionary budget. The full IDMC/Collibra platform covers MDM, lineage, data products, and cross-cloud connectivity in ways Orqentis never will. Orqentis's defense: Fabric-first buyers who want immediate contract enforcement without a 6-month implementation engagement, at a fraction of the cost.

---

## How We Win

**The enforcement layer nobody else has.** Orqentis is the only product that enforces ODCS v3.1.0 contracts at the Delta-transaction-log layer inside Microsoft Fabric, under the calling user's OBO-delegated identity. This is not a roadmap item. No competitor confirmed in the research ships this capability.[^r14]

**The Fabric-native wedge.** Orqentis runs inside the Fabric portal as a native Workload item. It emits Business Events into the Fabric Real-Time Hub. It triggers Activator automation. It reads TMDL metadata from Power BI Semantic Models. It traverses the tenant lineage graph via Fabric REST API. None of these integration points are accessible to external tools without compromising the OBO security model. This is a structural, architectural moat — not a feature advantage that a competitor can close with a sprint.[^r14]

**Open standard vs. proprietary lock-in.** ODCS v3.1.0 is maintained by Bitol under the LF AI & Data Foundation.[^r12] A customer's contracts are portable YAML files they own, version-control in Git, and can run through the open-source Data Contract CLI today. Every proprietary competitor — Purview DQ, Collibra, Informatica CLAIRE — creates vendor lock-in on their rule syntax. "We chose ODCS because we don't want to re-author 400 contracts if we migrate" is a real procurement objection that Orqentis answers.

**Pricing that doesn't require a procurement committee.** AUD $299/workspace/month on Azure Marketplace. A Fabric Platform Owner can expense-card this. Collibra at $150K–$500K/yr requires a CIO signature, a legal review, and a 6-month pilot. Orqentis gets into the environment in hours. The land-and-expand motion: start with the Community tier (free), show a board deck built on AI Act Evidence Pack output, convert to Enterprise.[^r11]

**The AI Act urgency forcing function.** EU AI Act general-purpose AI obligations begin August 2026.[^r15] Every EU enterprise with a Fabric deployment and a Copilot rollout is facing Article 10 compliance deadlines. Orqentis is the only tool that generates the evidence pack those compliance teams need, in a format that maps directly to the regulatory obligations.

---

[^r1]: ODCS v3.1.0, Bitol/LF AI & Data Foundation. `.artifacts/research/ai-readiness-frameworks.md §5`.
[^r2]: Microsoft Purview research. `.artifacts/research/competitive-landscape.md §1.1`; `.artifacts/research/fabric-gap-analysis.md §1.11, §1.12`.
[^r3]: Informatica IDMC + CLAIRE. `.artifacts/research/competitive-landscape.md §1.2`.
[^r4]: Collibra AI Governance. `.artifacts/research/competitive-landscape.md §1.3`.
[^r5]: Atlan. `.artifacts/research/competitive-landscape.md §1.4`.
[^r6]: Monte Carlo. `.artifacts/research/competitive-landscape.md §2.1`.
[^r7]: Securiti Gencore. `.artifacts/research/competitive-landscape.md §3.1`.
[^r8]: Immuta. `.artifacts/research/competitive-landscape.md §4.1`.
[^r9]: Lakera and Protect AI. `.artifacts/research/competitive-landscape.md §5.1, §5.2`.
[^r10]: Orqentis Fabric Workload capabilities. `README.md`; `docs/architecture.md`; `.artifacts/research/fabric-gap-analysis.md §6C`.
[^r11]: Orqentis pricing tiers. `README.md` (Community: free; Enterprise: AUD $299/workspace/mo).
[^r12]: Bitol / ODCS LF AI & Data Foundation. `lfaidata.foundation/projects/bitol/`, graduated sandbox September 2024. `.artifacts/research/ai-readiness-frameworks.md §5`.
[^r13]: Microsoft Purview pricing estimate. `.artifacts/research/competitive-landscape.md §C`.
[^r14]: Fabric ISV gap analysis. `.artifacts/research/fabric-gap-analysis.md §4.1, §6C`.
[^r15]: EU AI Act enforcement timeline. Regulation (EU) 2024/1689. `.artifacts/research/ai-readiness-frameworks.md §1.2`.

---

*2025-07-15 UTC*
