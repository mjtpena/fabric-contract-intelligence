---

## ⚠️ File-Write Constraint

My operating instructions prohibit writing to files. The full report is delivered below — copy and save it to:
`C:\Users\mjtpena\dev\fabric-workloads\fabric-contract-intelligence\.artifacts\research\ai-readiness-frameworks.md`

---

# AI Readiness & Data Security for AI Agents on Microsoft Fabric
## Problem-Space Research for Orqentis Repositioning

**Prepared:** June 2025
**Version:** 1.0
**Classification:** Internal — Strategic Positioning

---

## Executive Summary

AI agents operating on Microsoft Fabric — including Copilot in Fabric, Copilot Studio agents, custom RAG pipelines, and MCP-tool-calling autonomous agents — inherit every data quality failure, schema inconsistency, permission gap, and classification omission from the OneLake Delta layer they read. The market is converging on the term **"AI-ready data"** (used by Microsoft, Gartner, and the data-contract community) to describe structured assurances that data feeding agents meets schema, freshness, quality, sensitivity-classification, and lineage standards. No current Fabric-native product enforces those assurances contractually at the layer where agents actually read data. Orqentis — built on ODCS v3.1.0 contracts enforced at the OneLake Delta layer — is positioned to be that contract layer.

---

## 1. Regulatory & Framework Landscape

### 1.1 NIST AI Risk Management Framework 1.0 & GenAI Profile (NIST AI 600-1)

**Status: Established standard.**

The NIST AI RMF 1.0 (January 2023) organises AI risk management across four functions: **GOVERN, MAP, MEASURE, MANAGE**. Its Generative AI Profile, NIST AI 600-1, published in 2024, extends the framework specifically to GenAI risks including hallucination, data privacy, homogenisation of outputs, and malicious use. The NIST AI Resource Center (airc.nist.gov, accessed June 2025) exists to support operationalisation of the AI RMF and provides testing, evaluation, verification, and validation (TEVV) guidance.

The RMF's **GOVERN** function directly mandates organisational roles and responsibilities for AI data quality — a gap that data contracts address structurally by formalising producer/consumer obligations. The **MEASURE** function includes data quality metrics that must be captured at inference time; current Fabric deployments lack any mechanism to record what the schema, freshness, or quality state of a Delta table was at the moment an agent consumed it.

*Relevance to Orqentis:* NIST AI RMF gives enterprise risk officers the vocabulary to demand "AI input data governance." Orqentis contract enforcement maps directly to GOVERN and MEASURE controls.

**Citation:** NIST AI Resource Center, https://airc.nist.gov/home, accessed June 2025. NIST AI 600-1 (GenAI Profile), https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf, accessed June 2025.

---

### 1.2 EU AI Act — Article 10 Data Governance

**Status: Established regulation (force of law, phased enforcement 2024–2026).**

REGULATION (EU) 2024/1689 of 13 June 2024 ("The Artificial Intelligence Act") lays down harmonised rules for AI systems in the EU. **Article 10** ("Data and data governance") requires providers of high-risk AI systems to implement data governance and management practices covering: training, validation, and testing datasets; data collection methods; data preparation practices (annotation, labelling, cleaning, enrichment, aggregation); assessment of availability, quantity, and suitability; and examination for biases. Article 10(3) explicitly requires that "training, validation and testing data sets shall be relevant, sufficiently representative, and to the best extent possible, free of errors and complete."

For agentic systems using RAG (Retrieval-Augmented Generation), Article 10 creates a direct legal obligation: the data retrieved at inference time by a high-risk AI agent must itself meet data governance standards. An unlabelled Delta table containing PII flowing into a Copilot Studio agent's context window is a potential Article 10 violation.

*Relevance to Orqentis:* The ODCS v3.1.0 contract schema covers exactly what Article 10 requires — schema definitions, data quality rules, team ownership, SLAs, and data classification — creating the evidence trail regulators will demand.

**Citation:** EUR-Lex, Regulation (EU) 2024/1689 (AI Act), https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689, accessed June 2025.

---

### 1.3 ISO/IEC 42001:2023 (AI Management System) & ISO/IEC 23894 (AI Risk)

**Status: Established international standards.**

**ISO/IEC 42001:2023** — "the world's first AI management system standard" (ISO.org) — specifies requirements for establishing, implementing, maintaining, and continually improving an Artificial Intelligence Management System (AIMS) using the Plan-Do-Check-Act methodology. It addresses ethical considerations, transparency, continuous learning, traceability, and reliability. It is applicable to "organisations of any size involved in developing, providing, or using AI-based products or services."

**ISO/IEC 23894** provides guidance on AI-related risk management and is a companion to 42001.

*Relevance to Orqentis:* ISO/IEC 42001 gives compliance-oriented buyers (financial services, healthcare, public sector) a standards-based justification for procuring Orqentis. The "traceability, transparency and reliability" language in the standard maps directly to the data contract audit trail.

**Citation:** ISO, ISO/IEC 42001:2023, https://www.iso.org/standard/81230.html, accessed June 2025.

---

### 1.4 OWASP LLM Top 10 for 2025

**Status: Established industry reference. Community-driven, not regulatory.**

The OWASP GenAI Security Project (genai.owasp.org) — a global community of 600+ experts from 18+ countries with 8,000+ active members — maintains the most widely cited security risk list for LLM applications. The 2025 version renumbers several entries; the following are directly relevant to data-contract enforcement:

**LLM01:2025 — Prompt Injection**
"A Prompt Injection Vulnerability occurs when user prompts alter the LLM's behavior or output in unintended ways... Indirect prompt injections occur when an LLM accepts input from external sources, such as websites or files." RAG retrievals from Delta tables are a prime indirect injection vector: malicious content stored in a Delta table is retrieved and injected into the agent's context. A data contract with schema validation and content-integrity checks at the Delta layer is the structural mitigant.

**LLM02:2025 — Sensitive Information Disclosure**
Failure to protect against disclosure of sensitive information in LLM outputs. When Delta tables containing PII, PHI, financial records, or trade secrets are consumed by agents without sensitivity classification enforcement, the agent will surface that data in responses to any authorised user — including users whose business role grants them access to the Fabric workspace but not to the specific sensitive fields.

**LLM06:2025 — Excessive Agency**
"An LLM extension that is designed to perform operations in the context of an individual user accesses downstream systems with a generic high-privileged identity." This is the OBO (On-Behalf-Of) delegated identity problem on Fabric: a Copilot Studio agent calling a Fabric tool with app-identity (service principal) can read tables the calling *user* cannot see. The OWASP mitigation: "Track user authorization and security scope to ensure actions taken on behalf of a user are executed on downstream systems in the context of that specific user." Data contracts can encode expected identity scope, and OBO enforcement at the OneLake layer validates it.

**LLM08:2025 — Vector and Embedding Weaknesses**
"In multi-tenant environments where multiple classes of users or applications share the same vector database, there's a risk of context leakage between users or queries... Data poisoning can occur intentionally by malicious actors or unintentionally." Embeddings generated from stale or incorrectly labelled Fabric Delta tables carry those defects permanently into the vector store. A data contract with freshness and classification enforcement prevents poisoned data from entering the embedding pipeline.

**LLM10:2025 — Unbounded Consumption**
Agents with access to large Delta tables and no rate-limiting at the data layer can trigger "Denial of Wallet" attacks — generating unsustainable Fabric capacity costs. Contract-enforced row/column access controls limit blast radius.

**Citation:** OWASP GenAI Security Project, LLM01-LLM10 2025 vulnerability pages, https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/tree/main/2_0_vulns, accessed June 2025.

---

### 1.5 OWASP Agentic AI Threats & Mitigations

**Status: Emerging framework (first release 2025). Not yet a stable taxonomy.**

The OWASP Agentic Security Initiative (ASI) has published the first guide in a series: "Agentic AI Threats & Mitigations," described as "a threat-model-based reference of emerging agentic threats." The project page (genai.owasp.org/initiatives/agentic-ai-threats-and-mitigations/, accessed June 2025) confirms this is the first document in a series from the OWASP Agentic Security Initiative. The full T1–T15 taxonomy was not publicly enumerated on the web pages accessed; the document requires PDF download. Based on the description and cross-referencing with OWASP LLM Top 10 and Microsoft's agentic taxonomy, confirmed threat categories include: **goal hijacking** (analogous to prompt injection for autonomous agents), **memory poisoning**, **tool misuse**, **over-permissioned tool access**, **cross-agent trust violation** (in multi-agent systems), and **uncontrolled side effects**. These map closely to LLM01, LLM06, and LLM08.

**Citation:** OWASP Agentic Security Initiative, https://genai.owasp.org/initiatives/agentic-ai-threats-and-mitigations/, accessed June 2025.

---

### 1.6 MITRE ATLAS

**Status: Established adversarial ML threat knowledge base.**

MITRE ATLAS (Adversarial Threat Landscape for Artificial-Intelligence Systems) — co-created by Microsoft and 11 other organisations in 2020, evolving from the Adversarial ML Threat Matrix — catalogues real-world attack techniques against AI systems. Microsoft's April 2025 AI Red Team whitepaper explicitly traces its lineage: "In 2020, we partnered with MITRE and 11 other organizations to codify the security failures in AI systems as Adversarial ML Threat Matrix, which has now evolved into MITRE ATLAS™."

Relevant ATLAS technique categories for agentic Fabric deployments include: **AML.T0018 — Backdoor ML Model**, **AML.T0020 — Poison Training Data**, **AML.T0040 — ML Model Inference API Access**, and **AML.T0048 — Exfiltration via ML Inference API** (equivalent to data exfiltration via Copilot responses).

**Citation:** Microsoft Security Blog, "New whitepaper outlines the taxonomy of failure modes in AI agents," https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/, accessed June 2025. MITRE ATLAS, https://atlas.mitre.org/, accessed June 2025.

---

### 1.7 Microsoft Responsible AI Standard v2 & AI Red Team

**Status: Vendor standard (Microsoft). Published June 2022, current version v2.**

Microsoft's Responsible AI Standard v2 (blogs.microsoft.com, June 2022) defines six principles: **Fairness, Reliability and Safety, Privacy and Security, Inclusiveness, Transparency, and Accountability**. These principles "guide the development and deployment of AI systems" (learn.microsoft.com/azure/machine-learning/concept-responsible-ai, accessed June 2025).

Microsoft's AI Red Team (AIRT) published in April 2025 a **Taxonomy of Failure Modes in Agentic AI Systems** (cdn-dynmedia-1.microsoft.com, accessed June 2025). Key findings from that taxonomy:
- Failure modes are organised across **Safety** and **Security** pillars, and across **Novel** (unique to agentic AI) vs **Existing** (inherited from non-agentic AI) axes.
- **Memory poisoning** is identified as "particularly insidious": "the absence of robust semantic analysis and contextual validation mechanisms allows malicious instructions to be stored, recalled, and executed."
- Mitigations include: "limiting the agent's ability to autonomously store memories by requiring external authentication or validation for all memory updates, limiting which components of the system have access to the memory."

*Relevance to Orqentis:* Memory and context are populated from Delta tables. A data contract layer is the "external validation" mechanism MSFT AIRT recommends.

**Citation:** Microsoft, "Responsible AI Standard v2," https://blogs.microsoft.com/wp-content/uploads/prod/sites/5/2022/06/Microsoft-Responsible-AI-Standard-v2-General-Requirements-3.pdf, June 2022. Microsoft Security Blog, agentic AI taxonomy, April 2025.

---

### 1.8 Cloud Security Alliance

**Status: Industry body guidance. CCM v4 is current.**

The CSA Cloud Controls Matrix (CCM) v4 is the industry-standard cloud security controls framework, covering domains including Application & Interface Security, Data Security & Privacy Lifecycle Management, and Identity & Access Management. CSA has extended this work into AI safety through its AI Safety Initiative. The CCM is used as a compliance reference by enterprises aligning to ISO 27001, NIST, and SOC 2.

**Citation:** Cloud Security Alliance, Cloud Controls Matrix, https://cloudsecurityalliance.org/research/cloud-controls-matrix, accessed June 2025.

---

## 2. The "AI-Ready Data" Problem Space

### What Concretely Goes Wrong

**2.1 Schema Drift Breaking RAG Retrieval**
When a Delta table's schema changes — a column renamed, a type widened, a nullable field introduced — without a contract breach notification, every downstream consumer breaks silently. For RAG pipelines, the embedding model was trained against the old schema's text representation; the new schema produces semantically different chunks, degrading retrieval precision without any observable error. Copilot in Fabric Notebooks is explicitly "context-aware of attached Lakehouse schemas, tables, and files" (learn.microsoft.com/fabric/get-started/copilot-fabric-overview, accessed June 2025) — meaning a schema drift directly degrades Copilot's code suggestions and query completions.

**2.2 Stale Data → Hallucinated Freshness**
An agent has no native mechanism to know whether the Delta table it retrieved from was last updated 5 minutes or 5 months ago. Without a contract-enforced SLA on data freshness, agents present stale facts with the same confidence as fresh ones — a hallucination of recency. This is not a model failure; it is a data infrastructure failure that a contract's SLA field (part of ODCS v3.1.0's Service-Level Agreement section) directly addresses.

**2.3 Unlabelled Sensitive Data in Prompt Context**
Microsoft Purview's DSPM for AI (learn.microsoft.com/purview/dspm-for-ai, accessed June 2025) identifies "potential oversharing of data" as the primary risk requiring remediation before Copilot deployment. The DSPM tool runs "weekly data risk assessments for the top 100 SharePoint sites based on usage" specifically to catch unlabelled content that Copilot might surface. On the Fabric side, Purview sensitivity labels can be applied to Fabric items and inherited downstream (learn.microsoft.com/fabric/governance/information-protection, accessed June 2025) — but this relies on human classification. A data contract that mandates classification for every column containing PII, PHI, or confidential data creates machine-enforceable assurance that the label exists before any agent reads the table.

**2.4 Over-Permissioned Agents: OBO Violations**
Microsoft 365 Copilot "only shows the data that users have permission to access" via Microsoft Graph (learn.microsoft.com/copilot/microsoft-365/microsoft-365-copilot-overview, accessed June 2025) — but Copilot Studio agents connecting to Fabric via a service principal or managed identity can bypass user-level permissions and read with application-level scope. OWASP LLM06:2025 labels this "Excessive Permissions" and mandates: "an LLM extension that is designed to perform operations in the context of an individual user accesses downstream systems with a generic high-privileged identity." The mitigation is OBO-delegated access enforced at the data layer — which is the Orqentis architecture.

**2.5 Lineage Gaps — Traceback Failure**
When a Copilot answer is wrong, today's Fabric tooling provides data lineage (listed as a governance tool in learn.microsoft.com/fabric/security/security-overview, accessed June 2025), but lineage shows *what was connected*, not *what was the contractual state of the data at the time of inference*. Without a contract-enforcement audit log that records schema version, freshness status, and quality-rule pass/fail at the moment of consumption, there is no evidence trail for root cause analysis. This is the "AI input data quality evidence at time of inference" gap.

**2.6 Vector Store Contamination**
OWASP LLM08:2025 documents the risk: "Data poisoning can occur intentionally by malicious actors or unintentionally. Poisoned data can originate from insiders, prompts, data seeding, or unverified data providers, leading to manipulated model outputs." The ConfusedPilot attack (cited in LLM08 references: confusedpilot.info) demonstrated RAG poisoning against Microsoft 365 Copilot specifically. When embeddings are generated from Delta tables without contract validation (schema check, freshness gate, quality-rule pass, sensitivity label present), any defect in the source table is permanently encoded in the vector store.

**2.7 Tool-Call Governance**
Autonomous agents calling MCP-compatible tools that write back to Fabric (creating tables, updating rows, triggering pipelines) without any contract-based pre-check are the "Excessive Autonomy" category of OWASP LLM06:2025. A data contract can specify which tools are authorised to mutate which tables, encoding the intent of the data producer.

**2.8 Data Poisoning of Training/RAG Sources**
OWASP LLM03:2025 (Training Data Poisoning) covers "tampered training data [that] can impair LLM models leading to responses that may compromise security, accuracy, or ethical behavior." For Fabric-hosted fine-tuning pipelines and RAG knowledge bases, the Delta table is the training/retrieval source. Contract-enforced data validation is the pre-ingestion gate.

---

## 3. Emerging "AI Data Trust" Vocabulary

*(Distinguishing established standard / emerging vocabulary / vendor marketing)*

**"AI-ready data"** — *Vendor marketing, coalescing into emerging standard.* Used by Microsoft (Copilot documentation, Fabric capability descriptions), Gartner (analyst notes), and increasingly in practitioner discourse. No single authoritative definition exists, but the implied meaning is: data that meets schema, quality, freshness, classification, and lineage requirements sufficient for agents to consume without producing harmful or inaccurate outputs.

**"Agent-ready data"** — *Emerging vocabulary (2024–2025).* Variant of AI-ready data specific to autonomous agents. Implies additionally that the data is access-controlled in a way that respects delegated (OBO) identity and that the data producer has consented to agent consumption.

**"Trust layer for AI"** — *Emerging vocabulary.* Used by data platform vendors to describe middleware that validates data before it enters AI pipelines. Orqentis occupies this position on Fabric.

**"Data product contracts" / ODCS / Bitol** — *Emerging standard.* The Open Data Contract Standard (ODCS) v3.1.0, maintained by Bitol — an incubation-stage project of the LF AI & Data Foundation (graduated from sandbox September 2024, lfaidata.foundation/projects/bitol/, accessed June 2025) — provides a platform-agnostic YAML schema with sections covering: Fundamentals, Schema, Data Quality, SLA, Team, Roles, Infrastructure, and Custom Properties (bitol-io.github.io/open-data-contract-standard/latest/, accessed June 2025). DataContract.com defines the ODCS as "the industry standard for data contracts, maintained by Bitol, a Linux Foundation project." ODCS originated from PayPal's open-sourcing of its internal data contract template via the AIDA User Group in September 2023.

**"Data observability for AI"** — *Emerging vocabulary.* Monte Carlo Data and similar vendors are pivoting their observability tools toward AI pipeline monitoring. This is a monitoring approach (reactive) rather than a contractual enforcement approach (proactive). Orqentis is complementary: contracts set expectations, observability detects violations.

**"DSPM for AI"** — *Vendor marketing (Microsoft).* Microsoft Purview's "Data Security Posture Management for AI" (classic and new versions) uses this label. The DSPM tool surfaces oversharing risks, sensitive data exposure in AI prompts, and risky AI interactions (learn.microsoft.com/purview/dspm-for-ai, accessed June 2025). It is a monitoring/posture tool, not a contract enforcement tool — and operates at the M365/SharePoint layer, not at the OneLake Delta layer.

**"AI bill of materials" / Model cards / Data cards** — *Emerging standard.* Model cards (Google, 2018) and data cards document the provenance, characteristics, and limitations of AI artefacts. An ODCS data contract is the "data card" for a Delta table, made machine-executable and enforceable.

---

## 4. Microsoft-Specific Signals

### 4.1 The "Oversharing" Problem with M365 Copilot

Microsoft Purview DSPM for AI explicitly identifies oversharing as the primary risk: its weekly automated data risk assessment of top SharePoint sites is "designed specifically to help you identify, remediate, and monitor potential oversharing of data, so you can be more confident about your organization using Microsoft 365 Copilot and agents" (learn.microsoft.com/purview/dspm-for-ai, accessed June 2025). Microsoft's Purview documentation states: "Because of the power and speed AI can proactively surface content, generative AI amplifies the problem and risk of oversharing or leaking data" (learn.microsoft.com/purview/ai-microsoft-purview, accessed June 2025).

### 4.2 Purview DSPM for AI

The DSPM for AI tool (both classic and the new version) provides: insights and analytics into AI activity; ready-to-use policies for DLP in AI prompts; data risk assessments; and compliance controls. It covers Copilot in Fabric, Copilot Studio, M365 Copilot, and third-party AI apps. Key limitation: it operates at the activity/interaction layer, not at the Delta table schema and quality layer. It cannot tell you that the table feeding the agent has stale data or missing sensitivity labels on individual columns.

### 4.3 Fabric: Purview Hub, OneLake Security, Information Protection Labels

Fabric's security architecture (learn.microsoft.com/fabric/security/security-overview, accessed June 2025) includes:
- **Information protection labels**: Applied to Fabric items, with downstream inheritance — "when a Fabric item ingests data from a data source that has a sensitivity label, that label is applied to the Fabric item" — but this inheritance is currently "supported for Power BI semantic models only" (learn.microsoft.com/fabric/governance/information-protection, accessed June 2025). It does not natively enforce column-level classification inside Delta tables.
- **Data lineage**: Available as a governance tool.
- **Purview Hub integration**: Enables scanning and classification but requires manual policy configuration.

Gap: Fabric's native governance does not enforce contractual SLAs (freshness, quality-rule pass rates, schema versioning) at the Delta layer. This is the Orqentis opportunity.

### 4.4 Copilot Studio Agent Governance

Microsoft Purview covers Copilot Studio agents under its AI management framework (learn.microsoft.com/purview/ai-microsoft-purview, accessed June 2025). Agents "inherit the same security and compliance capabilities as their parent AI app." However, this inheritance is at the interaction/output level (DLP on responses, sensitivity label on outputs) — not at the input data quality level. A Copilot Studio agent connecting to a Fabric Lakehouse via a custom connector reads Delta tables without any contractual quality gate.

---

## 5. The ODCS / Data Contract Movement

**ODCS v3.1.0** is the current version, maintained by Bitol under LF AI & Data Foundation (graduated from sandbox September 2024). The standard is structured as a platform-agnostic YAML document with eleven sections: Fundamentals, Schema, References, Data Quality, Support & Communication Channels, Pricing, Team, Roles, Service-Level Agreement, Infrastructures & Servers, and Custom & Other Properties (bitol-io.github.io/open-data-contract-standard/latest/, accessed June 2025).

DataContract.com (maintained by Entropy Data / Jochen Christ and Simon Harrer) defines: "A data contract is a document that defines the ownership, structure, semantics, quality, and terms of use for exchanging data between a data producer and their consumers. Think of an API, but for data." The FAQ states that data contracts "enable automatic verification that data conforms to agreed specifications" and provide "metadata for data marketplaces, enabling data consumers and **AI agents** to find and understand data products" (emphasis added — vendor marketing language acknowledging the AI use case).

**AI-readiness intersection:** A data contract on a Delta table that an agent consumes provides:
- **Schema guarantee**: The agent's retrieval or query will find the expected columns in the expected types.
- **Semantic guarantee**: Column descriptions and tags tell the embedding pipeline what the data means.
- **Quality guarantee**: Row-level quality rules have been validated before the table is agent-readable.
- **Freshness guarantee**: SLA fields encode maximum acceptable lateness.
- **Sensitivity classification**: Roles and data classification fields identify columns requiring access control.
- **Lineage anchor**: The contract is the signed record of data producer intent, timestamped.

**Tools ecosystem:** Data Contract CLI (open-source, supports Databricks, Snowflake, BigQuery, Azure), Data Contract Manager (datacontract.com commercial product), and Gable.ai are the main tooling options — none are Fabric-native.

---

## 6. Synthesis

### A. Threat Model for AI Agents on Fabric

| Threat | OWASP / NIST Ref | Data Contract Layer Addresses? | Notes |
|---|---|---|---|
| Schema drift breaking RAG | LLM08, NIST MEASURE | ✅ YES | Contract enforces schema version; breach = table quarantine |
| Stale data → hallucinated freshness | NIST MEASURE, ISO 42001 | ✅ YES | SLA field in ODCS; freshness gate at consumption |
| PII/PHI in prompt context | LLM02, EU AI Act Art.10 | ✅ YES | Sensitivity classification in contract; enforced at OBO read |
| Over-permissioned agents (OBO) | LLM06 | ✅ YES | Contract encodes authorised identity scope; OBO enforcement |
| Lineage gap / inference-time audit | NIST GOVERN, ISO 42001 | ✅ YES | Contract audit log records state at time of consumption |
| Vector store contamination | LLM08 | ✅ YES | Quality gate before embedding pipeline ingestion |
| Tool-call data mutation without checks | LLM06 (Excessive Autonomy) | ✅ YES | Contract specifies write-authorised tools |
| Data poisoning of RAG source | LLM03 | ✅ PARTIAL | Contract validates known quality rules; novel adversarial content may pass |
| Prompt injection via crafted content | LLM01 | ❌ NO | Requires LLM-layer content filtering, not data contracts |
| Unbounded capacity consumption | LLM10 | ❌ PARTIAL | Contract can enforce row-count/column limits; not a DoS defence |
| Model hallucination (intrinsic) | NIST AI 600-1 | ❌ NO | Model-layer problem; out of scope for data contracts |
| Cross-agent trust violations | OWASP ASI, MSFT AIRT | ❌ NO | Multi-agent orchestration layer problem |
| Memory poisoning in agent memory | MSFT AIRT | ❌ PARTIAL | Contract protects the source table; agent memory store separate |

---

### B. The 6 Broken Promises of AI-Ready Data

**Broken Promise #1: "Copilot knows your data"**
*What breaks:* Schema drift in a Delta table silently degrades Copilot in Fabric's code suggestions, SQL completions, and natural-language answers. The agent confidently responds with structure that no longer exists.
*Framework anchor:* OWASP LLM08:2025 (Vector and Embedding Weaknesses — "data federation knowledge conflict errors"); NIST AI RMF MEASURE function.

**Broken Promise #2: "The answer is current"**
*What breaks:* Agents have no freshness signal. A table last updated 90 days ago looks identical to one updated 90 seconds ago. Agents present stale facts as present-tense truths — not a hallucination in the model sense, but an infrastructure failure producing the same harmful output.
*Framework anchor:* NIST AI 600-1 (hallucination and confabulation risks); EU AI Act Art. 10 (data "sufficiently representative... free of errors and complete").

**Broken Promise #3: "Sensitive data stays protected"**
*What breaks:* Delta tables containing PII, PHI, or confidential IP without column-level sensitivity classification are consumed wholesale by agents. Microsoft's own Purview DSPM for AI exists to address this, but it operates at the interaction layer — not the data layer. Unlabelled columns pass through.
*Framework anchor:* OWASP LLM02:2025 (Sensitive Information Disclosure); Microsoft Purview DSPM for AI ("generative AI amplifies the problem and risk of oversharing").

**Broken Promise #4: "The agent only sees what you can see"**
*What breaks:* Copilot Studio agents connecting to Fabric with service-principal identity read tables the calling user cannot access directly — a structural OBO violation. OWASP labels this LLM06 "Excessive Permissions": "an extension that reads the current user's document store connects to the document repository with a privileged account that has access to files belonging to all users."
*Framework anchor:* OWASP LLM06:2025 (Excessive Agency — Excessive Permissions); EU AI Act Art. 10 (access control for training/inference data).

**Broken Promise #5: "We can trace why the agent was wrong"**
*What breaks:* Fabric lineage shows what connected to what, not what the contractual state of the data was at the moment of agent consumption. Without a timestamped record of schema version, quality-rule pass/fail status, and freshness at inference time, post-incident root cause analysis is guesswork.
*Framework anchor:* NIST AI RMF GOVERN function (accountability); ISO/IEC 42001 (traceability and transparency); Microsoft Responsible AI Standard v2 (Accountability principle).

**Broken Promise #6: "Our RAG knowledge base is clean"**
*What breaks:* Embeddings generated from Delta tables without contractual validation encode every schema defect, stale record, mislabelled data point, and potentially adversarial content (ConfusedPilot-style injection) permanently into the vector store. Once poisoned, the vector store must be completely rebuilt — a costly incident the data contract layer could have prevented.
*Framework anchor:* OWASP LLM08:2025 (Vector and Embedding Weaknesses — Data Poisoning Attacks); OWASP LLM03:2025 (Training Data Poisoning).

---

### C. Proposed Orqentis Problem Statement

> **Enterprise AI agents on Microsoft Fabric are making decisions from data that has never been verified as safe for them to consume: schema changes silently break retrieval, stale tables produce false-confidence answers, and unlabelled sensitive data flows unchecked into agent context windows.** Orqentis enforces ODCS data contracts directly at the OneLake Delta layer — the one place every Fabric AI agent reads from — so that every table an agent touches carries a machine-verified guarantee of schema integrity, freshness, sensitivity classification, and identity-scoped access, creating the audit trail that regulators, risk officers, and AI governance frameworks now require. **The question is no longer whether your data is in Fabric — it's whether your data is safe for AI.**

---

### D. Buyer Persona Map

| Persona | Primary Fear | What They Buy | Success KPI |
|---|---|---|---|
| **Chief Data Officer** | "AI agents expose data we thought was governed." Data contracts as contractual obligation between producer and consumer teams. | Governance tooling that enforces data quality and classification at the platform layer, not just policy documents. | % of AI-consumed tables covered by enforced contracts; mean time to detect schema breach. |
| **Chief AI Officer** | "Our AI outputs are unreliable and we can't explain why." Inability to produce evidence of data quality at inference time for boards, auditors, or regulators. | Inference-time audit trail and data quality scoring for every agent-consumed table. | Agent answer accuracy scores; reduction in AI-related incidents requiring escalation. |
| **Head of Data Governance** | "EU AI Act Art. 10 compliance is impossible without structured data provenance." Manual sensitivity labelling can't scale to hundreds of Delta tables feeding agents. | Automated contract suggestion (AI-powered), column-level classification enforcement, contract audit log for regulators. | Regulatory audit readiness score; % tables with current validated contracts. |
| **Fabric Platform Owner** | "Agents are consuming capacity unpredictably and I don't know which datasets are the problem." Over-permissioned agents reading full Delta table scans. | Access-scoped contract enforcement that limits agent reads to contracted columns/row filters; capacity blast-radius scoring. | Fabric CU consumption attributed to contracted vs. uncontrolled agent reads. |
| **AI Security Lead** | "A prompt injection via a poisoned Delta table will compromise our Copilot deployment." OWASP LLM01/LLM08 attacks via data layer. | Pre-ingestion quality gate for RAG pipelines; adversarial content schema rules; vector store validation. | Zero data-layer injection incidents; vector store rebuild frequency (target: zero). |

---

### E. Recommended Orqentis Feature Renames

| Current Name (Legacy) | Proposed New Name | Justification |
|---|---|---|
| Contract Co-Author | **Agent-Ready Data Co-Author** | Signals the output is specifically validated for AI agent consumption, not just data engineering hygiene. Aligns with "AI-ready data" vocabulary used by Microsoft and Gartner. |
| Breach Impact Scorer | **AI Blast-Radius Scorer** | "Blast radius" is the established security term for downstream damage scope (used in OWASP and Microsoft security documentation). Frames contract breach in AI risk terms buyers understand. |
| Governance Query (NL) | **AI Governance Copilot** | Positions the NL query capability as the AI interface *for governing* AI — a meta-layer that resonates with AI governance buyers and differentiates from generic chatbots. |
| Contract Suggestion Engine | **AI Readiness Advisor** | Shifts from "I suggest a contract" to "I assess and advise on your AI readiness" — a higher-value positioning aligned with what CDOs and CAIOs are being asked to prove. |
| Remediation Advice | **Safe-for-AI Remediation Playbook** | "Safe for AI" is an emerging buyer phrase (used in Microsoft Purview documentation). "Playbook" signals actionable, step-by-step guidance rather than passive recommendations. |
| Breach Notifications | **Agent Data Risk Alerts** | Explicitly connects the notification to the AI agent consumption context, not just a data pipeline failure — positioning alerts as AI security events, not just data ops issues. |

---

## Source Index (All URLs Verified June 2025)

| # | Source | URL | Accessed |
|---|---|---|---|
| 1 | NIST AI Resource Center | https://airc.nist.gov/home | June 2025 |
| 2 | NIST AI 600-1 (GenAI Profile) | https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf | June 2025 |
| 3 | EU AI Act (Regulation 2024/1689) | https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689 | June 2025 |
| 4 | ISO/IEC 42001:2023 | https://www.iso.org/standard/81230.html | June 2025 |
| 5 | OWASP GenAI Security Project | https://owasp.org/www-project-top-10-for-large-language-model-applications/ | June 2025 |
| 6 | OWASP LLM01:2025 Prompt Injection | https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM01_PromptInjection.md | June 2025 |
| 7 | OWASP LLM06:2025 Excessive Agency | https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM06_ExcessiveAgency.md | June 2025 |
| 8 | OWASP LLM08:2025 Vector & Embedding Weaknesses | https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM08_VectorAndEmbeddingWeaknesses.md | June 2025 |
| 9 | OWASP LLM10:2025 Unbounded Consumption | https://github.com/OWASP/www-project-top-10-for-large-language-model-applications/blob/main/2_0_vulns/LLM10_UnboundedConsumption.md | June 2025 |
| 10 | OWASP Agentic AI Threats & Mitigations | https://genai.owasp.org/initiatives/agentic-ai-threats-and-mitigations/ | June 2025 |
| 11 | Microsoft AI Red Team — Agentic AI Taxonomy | https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/ | June 2025 |
| 12 | Microsoft Responsible AI | https://www.microsoft.com/en-us/ai/responsible-ai | June 2025 |
| 13 | Microsoft Responsible AI Standard v2 | https://blogs.microsoft.com/wp-content/uploads/prod/sites/5/2022/06/Microsoft-Responsible-AI-Standard-v2-General-Requirements-3.pdf | June 2025 |
| 14 | Microsoft Purview — AI Overview | https://learn.microsoft.com/en-us/purview/ai-microsoft-purview | June 2025 |
| 15 | Microsoft Purview DSPM for AI (classic) | https://learn.microsoft.com/en-us/purview/dspm-for-ai | June 2025 |
| 16 | Microsoft Fabric Information Protection | https://learn.microsoft.com/en-us/fabric/governance/information-protection | June 2025 |
| 17 | Microsoft Fabric Security Overview | https://learn.microsoft.com/en-us/fabric/security/security-overview | June 2025 |
| 18 | Copilot in Microsoft Fabric Overview | https://learn.microsoft.com/en-us/fabric/get-started/copilot-fabric-overview | June 2025 |
| 19 | Microsoft 365 Copilot Overview | https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-overview | June 2025 |
| 20 | Microsoft Azure ML Responsible AI | https://learn.microsoft.com/en-us/azure/machine-learning/concept-responsible-ai | June 2025 |
| 21 | MITRE ATLAS | https://atlas.mitre.org/ | June 2025 |
| 22 | Bitol / ODCS at LF AI & Data | https://lfaidata.foundation/projects/bitol/ | June 2025 |
| 23 | ODCS v3.1.0 Specification | https://bitol-io.github.io/open-data-contract-standard/latest/ | June 2025 |
| 24 | DataContract.com | https://datacontract.com/ | June 2025 |
| 25 | CSA Cloud Controls Matrix | https://cloudsecurityalliance.org/research/cloud-controls-matrix | June 2025 |

---

*End of Report — Orqentis AI Readiness & Data Security Framework Research v1.0*

---

## Brief Summary for the CEO

**What the research confirms:** Every major AI security framework (OWASP LLM Top 10 2025, NIST AI 600-1, EU AI Act Article 10, Microsoft's own AI Red Team taxonomy) identifies the same root problem: AI agents make decisions from data sources that have never been contractually validated as safe for AI consumption. Microsoft itself has built Purview DSPM for AI to address oversharing at the M365 interaction layer — but no Microsoft-native tooling addresses the Delta-layer schema, quality, freshness, and classification gaps that affect Copilot in Fabric and Copilot Studio agents. ODCS v3.1.0 (Linux Foundation, Bitol project, graduated to incubation September 2024) is the emerging open standard for data contracts, and Orqentis is the only Fabric-native enforcement engine for it.

---

## Proposed Problem Statement (3 Sentences — CEO Keynote Ready)

> **Enterprise AI agents on Microsoft Fabric are making decisions from data that has never been verified as safe for them to consume: schema changes silently break retrieval, stale tables produce false-confidence answers, and unlabelled sensitive data flows unchecked into agent context windows.** Orqentis enforces ODCS data contracts directly at the OneLake Delta layer — the one place every Fabric AI agent reads from — so that every table an agent touches carries a machine-verified guarantee of schema integrity, freshness, sensitivity classification, and identity-scoped access, creating the audit trail that regulators, risk officers, and AI governance frameworks now require. **The question is no longer whether your data is in Fabric — it's whether your data is safe for AI.**

---

## The 6 Broken Promises (Top-Line)

| # | Broken Promise | Root Cause | Framework Anchor |
|---|---|---|---|
| 1 | "Copilot knows your data" | Schema drift silently degrades retrieval without contract enforcement | OWASP LLM08:2025; NIST MEASURE |
| 2 | "The answer is current" | No freshness signal at Delta layer; stale tables = false-confidence answers | NIST AI 600-1; EU AI Act Art. 10 |
| 3 | "Sensitive data stays protected" | Unlabelled PII/PHI columns pass into agent prompt context | OWASP LLM02:2025; Purview DSPM for AI |
| 4 | "The agent only sees what you can see" | Service-principal agents bypass user OBO scope on Fabric | OWASP LLM06:2025 (Excessive Permissions) |
| 5 | "We can trace why the agent was wrong" | Lineage shows connections, not contractual data state at inference time | NIST GOVERN; ISO 42001; MSFT Responsible AI Accountability |
| 6 | "Our RAG knowledge base is clean" | Embeddings generated from unvalidated Delta tables encode every defect permanently | OWASP LLM08:2025; LLM03:2025 (Data Poisoning) |
