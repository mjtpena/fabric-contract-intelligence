# Orqentis Messaging Pillars
## Three Pillars for Sales, Marketing, and Analyst Conversations

---

## Pillar 1: AI Agents Are Only as Trustworthy as the Data They Ground On

### Billboard Headline
> **"Wrong data in. Wrong answers out. Contract the data first."**

### 60-Word Elevator
AI agents don't hallucinate in a vacuum. When a Fabric Data Agent or Copilot for Power BI returns a wrong answer, the root cause is almost always a data problem upstream: schema drift, a stale table, an unlabelled PII column, or a table that was never verified before it entered the agent's context window. Orqentis enforces ODCS data contracts at the Delta layer — before the data reaches any agent.

### Proof Points

**Proof Point 1.1 — OWASP names data-layer failures as primary LLM risks.**
OWASP LLM08:2025 (Vector and Embedding Weaknesses) states: "Data poisoning can occur intentionally by malicious actors or unintentionally. Poisoned data can originate from insiders, prompts, data seeding, or unverified data providers, leading to manipulated model outputs." OWASP LLM02:2025 (Sensitive Information Disclosure) documents how unlabelled sensitive columns in retrieved context lead to data leakage in AI responses. Both vulnerabilities are addressed at the data contract layer, before any prompt is constructed.[^1]

**Proof Point 1.2 — Microsoft's own DSPM for AI confirms the grounding data problem.**
Microsoft Purview DSPM for AI documentation states: "Because of the power and speed AI can proactively surface content, generative AI amplifies the problem and risk of oversharing or leaking data." The DSPM tool runs "weekly data risk assessments for the top 100 SharePoint sites based on usage" specifically to catch unlabelled content Copilot might surface — but it operates at the M365/SharePoint interaction layer, not at the OneLake Delta layer where Fabric AI agents read structured data.[^2]

**Proof Point 1.3 — No pre-Copilot contract check exists in the Fabric platform today.**
Microsoft Fabric's Copilot grounding model is "permissions-scoped" — Entra identity determines what data a user can access. There is no pre-flight mechanism to check whether the grounding semantic model's source tables meet their freshness, schema, or quality contracts before Copilot constructs a response. This is a confirmed architectural gap, not a roadmap item.[^3]

**Primary buyer persona:** AI Security Lead, Chief AI Officer.

---

## Pillar 2: Open Standards Beat Proprietary Catalogs

### Billboard Headline
> **"Your data contracts should outlive your vendor."**

### 60-Word Elevator
Every major enterprise data governance platform — Purview, Collibra, Informatica — enforces data quality in a proprietary rule language. When you leave the platform, you leave your contracts behind. ODCS v3.1.0 is a Linux Foundation open standard: YAML files you own, version-control in Git, and run through the open-source Data Contract CLI without any vendor. Orqentis brings ODCS natively into Microsoft Fabric — the enforcement engine, not the lock-in.

### Proof Points

**Proof Point 2.1 — ODCS is a Linux Foundation standard, not a vendor product.**
The Open Data Contract Standard v3.1.0 is maintained by Bitol, an incubation-stage project of the LF AI & Data Foundation that graduated from sandbox in September 2024. DataContract.com defines ODCS as "the industry standard for data contracts, maintained by Bitol, a Linux Foundation project." The standard covers schema, quality, SLA, team, roles, and infrastructure — the full set of obligations an AI agent needs verified before consumption. It is MIT-licensed.[^4]

**Proof Point 2.2 — Proprietary rule syntax is a procurement blocker in regulated industries.**
Purview Data Quality uses a proprietary expression engine; Collibra uses a business-glossary policy DSL; Informatica CLAIRE uses its own quality-rule format. None are ODCS-compatible. A financial services firm that authors 400 data quality contracts in Collibra's DSL cannot migrate those contracts to a different enforcement engine without reauthoring them from scratch. ODCS portability is a documented differentiator in enterprise data governance RFPs, where vendor lock-in risk is a top-5 evaluation criterion.[^5]

**Proof Point 2.3 — The open standard ecosystem creates distribution moat.**
The Data Contract CLI (`github.com/datacontract/datacontract-cli`) — the open-source tool that parses, validates, and tests ODCS contracts — is widely used by data engineering teams. ODCS adoption is growing in enterprises using dbt, Databricks, and Snowflake. Every team already using ODCS YAML in their Git repo can bring those contracts into Fabric via Orqentis without reauthoring. No Fabric-native competitor offers this import path.[^4]

**Primary buyer persona:** Head of Data Governance, Fabric Platform Owner.

---

## Pillar 3: The Trust Signal Must Reach the AI Runtime, Not Just the Catalog

### Billboard Headline
> **"A quality score in a catalog won't stop a wrong answer at 9 a.m."**

### 60-Word Elevator
Data catalogs tell you what your data means and how trustworthy it was last Tuesday. Data observability tools alert you after a table goes bad. Neither blocks an AI agent from consuming data that fails its contract right now. Orqentis enforces contracts at query time — producing a real-time contract status signal that reaches the Copilot grounding pipeline, Activator, and the AI blast-radius dashboard before a wrong answer is delivered.

### Proof Points

**Proof Point 3.1 — Catalog-grade quality scores don't intercept AI consumption.**
Purview Data Quality scans run on a minimum hourly schedule and produce quality scores in the Purview catalog portal. There is no API that the Fabric Copilot grounding pipeline can call to check current contract status before grounding. DSPM for AI monitors interaction risk *after* grounding. Catalog scores are visibility tools; they are not enforcement gates.[^3]

**Proof Point 3.2 — NIST AI RMF MEASURE requires real-time evidence at inference time.**
The NIST AI Risk Management Framework MEASURE function requires organisations to capture data quality metrics "at inference time" — not at last-scan time. NIST AI 600-1 (GenAI Profile) specifically addresses the risk of confabulation caused by stale retrieval data. The only architecture that satisfies this is one that checks contract status at or immediately before the query — not one that runs scheduled scans and surfaces advisory scores.[^6]

**Proof Point 3.3 — The blast-radius problem requires live lineage + live contract status.**
When a data contract fails, the immediately actionable question is "which AI consumers are at risk right now?" That question requires joining live Fabric lineage graph data with active AI consumer sessions and the current contract breach status. Microsoft's Fabric Impact Analysis shows structural dependencies; it has no concept of AI blast-radius — "if this table's contract is in breach, which Copilot sessions, Fabric Data Agents, and Copilot Studio agents are currently grounded on it?" This requires a contract runtime (Orqentis) with real-time access to both lineage and contract state — a capability confirmed absent from all current Fabric-native and third-party tools.[^7]

**Primary buyer persona:** Chief Data Officer, Chief AI Officer, Fabric Platform Owner.

---

## Usage Guide for Sales and Marketing

| Context | Use Pillar | Lead with |
|---|---|---|
| CDO / CAIO first call | Pillar 1 | "Wrong data in, wrong answers out" — the six broken promises |
| Governance / compliance RFP | Pillar 2 | ODCS open standard vs. proprietary lock-in; EU AI Act evidence pack |
| Fabric Platform Owner demo | Pillar 3 | Pre-Copilot Contract Gate + blast-radius live demo |
| Security audience (CISO, AI Security Lead) | Pillar 1 + Pillar 3 | OWASP LLM08 + OBO identity enforcement |
| Investor pitch | Pillar 2 + Pillar 3 | Open standard moat + Microsoft-native timing |
| Analyst briefing | All three | ODCS ecosystem traction + Fabric-native enforcement gap |

---

[^1]: OWASP LLM Top 10 2025: LLM02 (Sensitive Information Disclosure), LLM08 (Vector and Embedding Weaknesses). `github.com/OWASP/www-project-top-10-for-large-language-model-applications/tree/main/2_0_vulns`. See `.artifacts/research/ai-readiness-frameworks.md §1.4`.
[^2]: Microsoft Purview DSPM for AI: "generative AI amplifies the problem and risk of oversharing." `learn.microsoft.com/purview/dspm-for-ai`. See `.artifacts/research/ai-readiness-frameworks.md §4.1`.
[^3]: Fabric Copilot grounding gap confirmed: no pre-flight contract verification. `learn.microsoft.com/fabric/get-started/copilot-privacy-security`. See `.artifacts/research/fabric-gap-analysis.md §1.7, §Gap 2`.
[^4]: ODCS v3.1.0 / Bitol / LF AI & Data Foundation. `lfaidata.foundation/projects/bitol/`; `bitol-io.github.io/open-data-contract-standard/latest/`. See `.artifacts/research/ai-readiness-frameworks.md §5`.
[^5]: Competitive proprietary rule-syntax analysis. `.artifacts/research/competitive-landscape.md §B, §C`.
[^6]: NIST AI RMF MEASURE function; NIST AI 600-1 confabulation risk. `airc.nist.gov`. See `.artifacts/research/ai-readiness-frameworks.md §1.1`.
[^7]: Fabric blast-radius gap confirmed: no native "AI blast-radius scoring" in Purview, Impact Analysis, or any confirmed ISV. See `.artifacts/research/fabric-gap-analysis.md §Gap 6, §6B Rank 3`.

---

*2025-07-15 UTC*
