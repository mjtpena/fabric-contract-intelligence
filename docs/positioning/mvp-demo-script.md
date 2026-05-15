# Orqentis MVP Demo Script
## AI Readiness & Data Security for AI Agents on Microsoft Fabric
### 12-Minute Scripted Demo — Fabric Customer / Investor Edition

**Audience:** Fabric Platform Owners, CDOs, Chief AI Officers, AI Security Leads, seed investors  
**Prerequisites:** Orqentis Enterprise installed in a Fabric workspace. Sample Lakehouse with `sales_daily` Delta table. Power BI semantic model `Sales Analytics` grounded on that table. Fabric Data Agent `Finance Q&A` connected to the same Lakehouse.  
**Tone:** Confident. No live-coding anxiety. The story matters more than the click.

---

## Cold Open — 0:00–0:30

**Presenter says:**
> "Microsoft Copilot in Power BI answered a board-level question last Tuesday. The answer was wrong. Not because the AI hallucinated — because the data it was grounded on was 72 hours stale, and nobody knew. That broken promise has a name. Today I'm going to show you how Orqentis closes it — in Fabric, natively, in under 15 minutes."

**Screen action:** Dark slide with a single line: *"The answer was confident. The data was 72 hours stale."*

**Buyer fear addressed:** Chief AI Officer — unreliable AI outputs with no traceable root cause.

---

## Scene 1: "Yesterday's Copilot Answer Was Wrong" — 0:30–2:00

**Presenter says:**
> "This is a Power BI report that our sales team uses every morning. It's grounded on a Fabric Lakehouse table called `sales_daily`. Copilot for Power BI is enabled on the underlying semantic model. Yesterday, a sales VP asked Copilot to summarize Q3 pipeline performance. The answer came back instantly — confident, formatted, completely wrong. The semantic model hadn't refreshed because the Lakehouse pipeline failed silently 72 hours earlier. No alert. No warning. The Copilot grounding just served the stale snapshot."

**Screen action:** Show the Power BI report open. Click the Copilot pane. Show the Q3 summary response that was generated (pre-prepared screenshot or live demo). Point to the 'Last refreshed' timestamp in the report — show it is 72 hours ago.

> "Fabric's lineage view shows the connection between the Lakehouse and the semantic model. It shows what connected to what. It does not show whether the data was contract-compliant at the moment Copilot consumed it. That gap is the problem Orqentis solves."

**Screen action:** Switch to the Fabric workspace. Open lineage view. Show the `sales_daily` → `Sales Analytics` → Power BI report chain. Hover over `sales_daily` — show no contract badge, no freshness indicator.

**FR-IDs demonstrated:** FR-001 (contract freshness SLA), FR-028 (Pre-Copilot Contract Gate integration), FR-035 (Fabric lineage context).  
**Buyer fear addressed:** CDO — AI agents exposing ungoverned data; CAIO — no evidence trail when AI output is wrong.

---

## Scene 2: Author a Contract with Agent-Ready Contract Co-Author — 2:00–4:00

**Presenter says:**
> "Orqentis runs natively inside the Fabric portal — no new browser tab, no external tool, no API keys to configure. I'm going to open the Orqentis workload right here in the workspace and create a contract for `sales_daily` in under two minutes."

**Screen action:** Click the Orqentis workload item in the left Fabric nav. The Orqentis item list opens — currently empty for `sales_daily`. Click **+ New Contract**. In the 'Select source' dialog, choose `sales_daily` from the Lakehouse dropdown.

> "Orqentis reads the Delta transaction log for this table — under my own delegated identity, not a service account. It profiles the actual committed schema, calculates the average freshness pattern from the last 30 days of Delta log commits, and detects two columns that match PII sensitivity patterns."

**Screen action:** The Monaco editor opens. The ODCS v3.1.0 YAML is pre-populated by Agent-Ready Contract Co-Author. Point to the populated sections:
- `schema:` block — all columns with inferred types, 2 columns tagged `pii: true`
- `serviceLevel:` → `freshness:` → `threshold: 4h` (AI-suggested based on historical refresh cadence)  
- `quality:` block — 3 suggested rules: row count > 1000, `revenue` column non-null rate > 99%, `close_date` type conformity

> "Every field here came from the actual table, not from a template. The AI co-author inferred the freshness SLA from 30 days of real Delta log commit history. The PII columns were flagged by pattern matching against the column names and value distributions. I can accept all of these or edit any field — it's standard ODCS YAML with full IntelliSense."

**Screen action:** Hover over the `freshness:` field. Show the IntelliSense tooltip explaining the ODCS v3.1.0 `serviceLevel.freshness.threshold` property. Type `8h` to override, then change it back to `4h`. Click **Validate** — green checkmark appears.

> "I'm saving this contract. It is now a first-class Fabric item alongside the Lakehouse and the semantic model — it will appear in lineage view, it is version-controlled, and it is ready to enforce."

**Screen action:** Click **Save as Active**. The contract `sales_daily_v1` appears in the Orqentis item list with status `ACTIVE`.

**FR-IDs demonstrated:** FR-003 (ODCS v3.1.0 authoring), FR-004 (AI contract suggestion from Delta profile), FR-005 (IntelliSense Monaco editor), FR-007 (schema inference via OBO Delta log read).  
**Buyer fear addressed:** Head of Data Governance — scaling contract authoring to hundreds of tables without a 6-month implementation.

---

## Scene 3: Run Enforcement — 4:00–6:00

**Presenter says:**
> "Now I'll run enforcement against `sales_daily`. In production this runs on a configurable schedule — hourly, daily, or triggered by a Fabric pipeline event. I'm running it manually now to show the output."

**Screen action:** In the Orqentis contract view for `sales_daily_v1`, click **Run Enforcement Now**. A progress bar shows three phases: Schema Check, Freshness Check, Quality Rules.

> "The schema check diffs the live Delta log schema against the ODCS contract schema definition. The freshness check reads the latest commit timestamp from the Delta transaction log — again, under my delegated identity — and compares it against the four-hour SLA. The quality rules evaluate against the actual data using a pushdown query."

**Screen action:** Enforcement run completes. Show the results panel:
- **Schema Check:** ✅ PASS — schema matches contract definition
- **Freshness Check:** ❌ BREACH — last commit 72 hours ago; SLA 4 hours; breach duration 68 hours
- **Quality Rule — Row Count:** ✅ PASS — 45,231 rows
- **Quality Rule — Revenue Non-Null:** ✅ PASS — 99.7%
- **Quality Rule — Close Date Conformity:** ✅ PASS

> "The freshness breach is exactly what caused the wrong Copilot answer yesterday. Orqentis has now persisted this breach record — with the Delta log version, the breach timestamp, the SLA definition, and the OBO identity that ran the check — as a structured result in OneLake. This is the audit trail that regulators want."

**Screen action:** Click **View Result JSON**. Show the `result_json` structure: `{ "contractId": "sales_daily_v1", "runId": "...", "runAt": "2025-07-15T03:00:00Z", "status": "BREACH", "breachType": "freshness", "slaThreshold": "4h", "actualFreshness": "72h", "deltaLogVersion": 847, "runIdentity": "user@contoso.com" }`.

**FR-IDs demonstrated:** FR-010 (scheduled/manual enforcement runs), FR-011 (schema diff enforcement), FR-012 (freshness SLA enforcement), FR-013 (quality rule enforcement), FR-014 (result_json persistence to OneLake), FR-015 (OBO identity audit log).  
**Buyer fear addressed:** CDO — machine-verifiable evidence that data is not contract-compliant; Head of Data Governance — audit trail for regulators.

---

## Scene 4: AI Blast-Radius Scorer — 6:00–8:00

**Presenter says:**
> "Here is the question a CDO asks when they see a breach notification: 'What else is broken right now? Which of my AI workloads is currently reading this bad data?' That question has never had a real-time answer in Fabric — until Orqentis."

**Screen action:** The breach banner at the top of the enforcement run result shows a new button: **View AI Blast Radius**. Click it.

> "Orqentis is traversing the Fabric lineage graph right now, using the Fabric REST API under my workload's service principal, to find every downstream consumer of `sales_daily` that is currently active. This includes Power BI reports, Copilot semantic models, Fabric Data Agents, Copilot Studio agents, and Microsoft 365 Copilot grounding sources."

**Screen action:** The AI Blast-Radius panel loads. Show the results — a severity-ranked list:

| Severity | Consumer | Type | Last Queried | Risk |
|---|---|---|---|---|
| 🔴 Critical | Sales Analytics (semantic model) | Power BI Copilot grounding source | 14 min ago | Board report grounded on stale data |
| 🔴 Critical | Finance Q&A | Fabric Data Agent | 2 hours ago | Agent serving Q3 answers from stale Lakehouse |
| 🟠 High | Q3 Pipeline Dashboard | Power BI Report | 45 min ago | Direct report, user-visible |
| 🟡 Medium | Microsoft 365 Copilot | M365 Copilot grounding (via semantic model) | 3 hours ago | Indirectly grounded via Sales Analytics |
| 🟡 Medium | Contoso Copilot Studio agent | Copilot Studio skill | Not queried today | Downstream risk if queried |

> "Five consumers. Two critical. The semantic model feeding Copilot for Power BI was queried 14 minutes ago — meaning a user got a Copilot answer in the last 15 minutes grounded on 72-hour-stale data. The Fabric Data Agent serving Finance Q&A was queried 2 hours ago. And through the semantic model, this breach is also reaching Microsoft 365 Copilot."

**Screen action:** Click on **Sales Analytics** in the blast-radius list. Show the lineage sub-panel: `sales_daily` → `Sales Analytics` → `Q3 Pipeline Dashboard` and `M365 Copilot grounding`. The blast-radius path is highlighted.

> "No other product — not Purview, not Collibra, not Monte Carlo — can produce this view. It requires joining the live Fabric lineage graph with the active AI consumer sessions and the contract breach status. Orqentis is the only tool with access to all three."

**FR-IDs demonstrated:** FR-016 (AI Blast-Radius Scorer), FR-017 (Fabric lineage graph traversal via REST API), FR-018 (AI consumer severity ranking), FR-029 (cross-workspace blast-radius).  
**Buyer fear addressed:** Chief AI Officer — understanding AI operational risk at breach time; CDO — contractual accountability for downstream AI consumers.

---

## Scene 5: Pre-Copilot Contract Gate — 8:00–9:30

**Presenter says:**
> "Now I'll show you what happens *next time* — after this breach is resolved. Orqentis can be configured to gate Copilot grounding before it consumes a table that's in breach."

**Screen action:** Navigate to the Orqentis Policy panel. Show the **Pre-Copilot Contract Gate** policy for the `Sales Analytics` semantic model. The policy is set to `WARN on BREACH — tag semantic model contract-status: BREACH`.

> "When the enforcement run detects a freshness breach, Orqentis automatically tags the `Sales Analytics` semantic model with the metadata attribute `orqentis-contract-status: BREACH`. Copilot for Power BI can read this attribute from the semantic model metadata. Depending on the customer's Fabric admin policy, this tag surfaces a warning banner in the Copilot pane — 'Data contract breach detected: this semantic model's freshness SLA has been violated' — or in a stricter configuration, blocks grounding entirely until the contract is resolved."

**Screen action:** Show the Fabric Activator rule that fires on this breach event. The Activator rule is:
- **Trigger:** Orqentis Business Event — `contractStatus == BREACH AND contractId == sales_daily_v1`  
- **Condition:** `BECOMES BREACH`  
- **Action 1:** Fabric Pipeline — `Trigger sales_daily_refresh_pipeline`
- **Action 2:** Teams notification → Data Steward channel: "sales_daily contract breach: freshness SLA violated. Refresh pipeline triggered."

> "No-code. Native Fabric Activator. Orqentis emits the breach as a Business Event into the Fabric Real-Time Hub. The Activator rule was set up once by the Fabric Platform Owner. Every future breach automatically triggers the remediation pipeline and notifies the steward."

**Screen action:** Show the Activator rule visual. Point to the Business Event source from Orqentis, the BECOMES BREACH condition, and the two actions.

**FR-IDs demonstrated:** FR-019 (Pre-Copilot Contract Gate), FR-020 (Activator integration via Business Events), FR-021 (contract-status tag on semantic model), FR-022 (Teams notification on breach).  
**Buyer fear addressed:** AI Security Lead — preventing stale/breached data from entering Copilot context; Fabric Platform Owner — automated remediation without manual intervention.

---

## Scene 6: AI Act Evidence Pack — 9:30–11:00

**Presenter says:**
> "The compliance auditor doesn't care about your Activator rule. They want a document. Specifically, they want evidence that your AI system operated on data that met its contractual data governance obligations — which is what EU AI Act Article 10 requires. Orqentis generates that document in one click."

**Screen action:** In the Orqentis contract view for `sales_daily_v1`, click **Export AI Act Evidence Pack**. A dialog appears with options: date range (select last 30 days), regulation mapping (checkboxes: EU AI Act, NIST AI RMF, ISO/IEC 42001), format (PDF + JSON).

> "Orqentis pulls together every enforcement run record for this contract in the selected period, the AI blast-radius records showing which agents consumed the table, the OBO identity log showing who ran each check, the MIP sensitivity label state at each run, the Delta log versions, and the NIST AI RMF and EU AI Act Article mappings. It produces a structured evidence bundle."

**Screen action:** Show the generated PDF opened in the browser (pre-generated for demo speed). Scroll through:
- **Cover page:** Contract ID, period, generating identity, Orqentis version
- **Section 1: Contract Definition** — the ODCS v3.1.0 YAML at the time of each run
- **Section 2: Enforcement Run History** — table of all runs with schema/freshness/quality pass/fail per run
- **Section 3: Breach Events** — the freshness breach record with Delta log version, breach duration, OBO identity
- **Section 4: AI Consumers at Breach Time** — the blast-radius list, which consumers were active
- **Section 5: Regulatory Mapping** — table mapping each enforcement element to EU AI Act Article 10(3), NIST AI RMF GOVERN/MEASURE, ISO/IEC 42001:2023 traceability controls
- **Section 6: MIP Label Audit** — sensitivity label state on the Lakehouse item at each enforcement run

> "Hand this to your EU AI Act assessor. Every claim is backed by a Delta log version number and a timestamped OBO identity. This is not a policy attestation — it is cryptographically traceable evidence."

**FR-IDs demonstrated:** FR-023 (AI Act Evidence Pack generation), FR-024 (OBO identity audit log in evidence bundle), FR-025 (regulatory framework mapping), FR-026 (PDF/JSON export to OneLake).  
**Buyer fear addressed:** Head of Data Governance — EU AI Act Article 10 compliance evidence; Chief AI Officer — board-level AI accountability documentation.

---

## Scene 7: AI Governance Assistant — 11:00–12:00

**Presenter says:**
> "Last capability. Your Fabric Platform Owner does not want to read ODCS YAML. They want to ask a question and get a ranked answer. The AI Governance Assistant is the natural-language interface to the entire Orqentis contract estate."

**Screen action:** Navigate to the AI Governance Assistant panel in the Orqentis workload. Show the query input box.

> "I'll ask the question that every CAIO has right now."

**Screen action:** Type: `Which contracts are currently feeding our Microsoft 365 Copilot grounding sources?`

> "Orqentis queries the contract registry, the lineage graph, and the breach status in real time and returns a ranked list."

**Screen action:** Show the response:

```
3 contracts currently feed Microsoft 365 Copilot grounding sources via Power BI semantic models:

1. sales_daily_v1 [BREACH — freshness 72h, SLA 4h] → Sales Analytics → M365 Copilot
   ⚠ Copilot grounding gate active. Steward notified. Refresh pipeline triggered.

2. customer_master_v2 [PASSING] → Customer 360 → M365 Copilot
   Last enforcement: 23 min ago. All checks pass.

3. product_inventory_v1 [WARNING — no enforcement run in 48h] → Product Catalog → M365 Copilot
   ⚠ Scheduled enforcement missed. Recommend: run manually or check pipeline.
```

> "One contract in breach. One passing. One that hasn't been enforced in 48 hours and needs attention. The platform owner can act on all three from this panel without opening a single YAML file or a Purview portal."

**Screen action:** Click on `product_inventory_v1`. Show the quick action buttons: **Run Enforcement Now**, **View Contract**, **Open Blast Radius**, **Notify Steward**.

**FR-IDs demonstrated:** FR-030 (AI Governance Assistant NL query), FR-031 (real-time contract status aggregation), FR-032 (recommended next actions from governance query).  
**Buyer fear addressed:** Fabric Platform Owner — governing the full AI contract estate without YAML expertise; CDO — executive-ready governance posture visibility.

---

## Close — 12:00 (30 seconds over if needed)

**Presenter says:**
> "What you just saw: a contract authored from a Delta table profile in under 2 minutes, a freshness breach detected and persisted as a structured audit record, five AI consumers identified and severity-ranked in real time, Activator automating the remediation, and a one-click compliance pack for the EU AI Act auditor. All inside the Fabric portal. All under your users' delegated identities. No egress, no service accounts, no separate vendor portals."

> "Community tier is free — one workspace, twenty contracts, manual enforcement. Enterprise is AUD $299 per workspace per month on Azure Marketplace. You can be running your first enforcement in under an hour. The question is no longer whether your data is in Fabric. It's whether your data is safe for AI."

**Screen action:** Show pricing table from the Orqentis workload landing page.

---

## Discovery Questions

Use these eight questions to qualify a Fabric customer before investing in a full demo.

| # | Question | Positive signal |
|---|---|---|
| 1 | "How many Delta tables in your Fabric environment are currently being read by Copilot, Fabric Data Agents, or Copilot Studio agents?" | > 10 tables feeding AI → real blast-radius exposure |
| 2 | "Has a Copilot or AI-generated answer been wrong or misleading in the last 90 days? Do you know why?" | Yes, and they don't know why → immediate pain |
| 3 | "Are you under EU AI Act obligations, or do you have internal AI Act compliance deadlines?" | EU enterprise, Aug 2026 deadline → evidence pack urgency |
| 4 | "Do your Fabric Data Agents or Copilot Studio agents connect to OneLake using a service principal or managed identity?" | Yes → OBO violation risk (OWASP LLM06) — strong wedge |
| 5 | "How do you currently verify that a Power BI semantic model's underlying data is fresh and valid before Copilot grounds on it?" | "We don't" or "we check manually" → Pre-Copilot Contract Gate is the sale |
| 6 | "Have you looked at Purview Data Quality for this problem? What gap did you find?" | "Purview doesn't block Copilot" or "it runs on a schedule" → perfect Orqentis entry |
| 7 | "If a Lakehouse pipeline fails and a Delta table goes stale, how long does it take your team to know that downstream AI agents are affected?" | > 30 min → AI Blast-Radius Scorer is the sale |
| 8 | "Are you adopting a data-as-a-product or data mesh model in Fabric? Do your data producers have contractual SLAs with consumers?" | Yes → ODCS contracts are the natural formalization of those SLAs |

---

*2025-07-15 UTC*
