"""Build the Orqentis investor pitch deck."""
from __future__ import annotations

from pathlib import Path

from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt
from lxml import etree

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "docs" / "pitch" / "orqentis-pitch.pptx"

# ---------- Brand palette ----------
INK = RGBColor(0x0B, 0x1F, 0x3A)        # deep navy ink
INK_SOFT = RGBColor(0x33, 0x4E, 0x68)
ACCENT = RGBColor(0x11, 0x77, 0xD1)     # Fabric-ish blue
ACCENT_DARK = RGBColor(0x0B, 0x5C, 0xA8)
TEAL = RGBColor(0x12, 0xB7, 0x9C)
AMBER = RGBColor(0xF2, 0xA3, 0x1B)
CORAL = RGBColor(0xE0, 0x4B, 0x53)
PAPER = RGBColor(0xF6, 0xF8, 0xFB)
LINE = RGBColor(0xE1, 0xE6, 0xED)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0x6B, 0x77, 0x88)

W, H = Inches(13.333), Inches(7.5)

prs = Presentation()
prs.slide_width = W
prs.slide_height = H
BLANK = prs.slide_layouts[6]


# ---------- Helpers ----------
def add_rect(slide, x, y, w, h, fill, line=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line; shp.line.width = Pt(0.75)
    shp.shadow.inherit = False
    return shp


def add_round(slide, x, y, w, h, fill, line=None, radius=0.06):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    shp.adjustments[0] = radius
    shp.fill.solid(); shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line; shp.line.width = Pt(0.75)
    shp.shadow.inherit = False
    return shp


def add_text(slide, x, y, w, h, text, *, size=14, bold=False, color=INK,
             align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, font="Segoe UI"):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    lines = text.split("\n") if isinstance(text, str) else text
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        r.text = line
        r.font.name = font
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = color
    return tb


def add_bullets(slide, x, y, w, h, items, *, size=13, color=INK, bullet_color=None,
                line_spacing=1.15):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.line_spacing = line_spacing
        p.space_after = Pt(4)
        if isinstance(item, tuple):
            head, rest = item
        else:
            head, rest = None, item
        if head:
            r1 = p.add_run()
            r1.text = "■ "
            r1.font.name = "Segoe UI"
            r1.font.size = Pt(size)
            r1.font.bold = True
            r1.font.color.rgb = bullet_color or ACCENT
            r2 = p.add_run()
            r2.text = f"{head}  "
            r2.font.name = "Segoe UI"
            r2.font.size = Pt(size)
            r2.font.bold = True
            r2.font.color.rgb = color
            r3 = p.add_run()
            r3.text = rest
            r3.font.name = "Segoe UI"
            r3.font.size = Pt(size)
            r3.font.color.rgb = color
        else:
            r1 = p.add_run()
            r1.text = "■  "
            r1.font.name = "Segoe UI"
            r1.font.size = Pt(size)
            r1.font.bold = True
            r1.font.color.rgb = bullet_color or ACCENT
            r2 = p.add_run()
            r2.text = rest
            r2.font.name = "Segoe UI"
            r2.font.size = Pt(size)
            r2.font.color.rgb = color
    return tb


def page_chrome(slide, title, eyebrow=None, page_num=None, total=None,
                bg=WHITE, footer="Orqentis  |  Investor Deck  |  Confidential"):
    add_rect(slide, 0, 0, W, H, bg)
    # left rule
    add_rect(slide, Inches(0.5), Inches(0.7), Inches(0.08), Inches(0.5), ACCENT)
    if eyebrow:
        add_text(slide, Inches(0.7), Inches(0.65), Inches(8), Inches(0.3),
                 eyebrow.upper(), size=10, bold=True, color=ACCENT)
    add_text(slide, Inches(0.7), Inches(0.92), Inches(11), Inches(0.7),
             title, size=28, bold=True, color=INK)
    # footer line
    add_rect(slide, Inches(0.5), Inches(7.05), Inches(12.3), Emu(9525), LINE)
    add_text(slide, Inches(0.5), Inches(7.12), Inches(8), Inches(0.3),
             footer, size=9, color=MUTED)
    if page_num is not None and total is not None:
        add_text(slide, Inches(11.5), Inches(7.12), Inches(1.3), Inches(0.3),
                 f"{page_num:02d} / {total:02d}", size=9, color=MUTED,
                 align=PP_ALIGN.RIGHT)


def add_image_card(slide, x, y, w, h, image_path, *, caption=None):
    """Place an image cleanly fit inside (x,y,w,h) with shadow + card behind."""
    # card background
    card = add_round(slide, x, y, w, h, WHITE, line=LINE, radius=0.03)
    # compute fit
    img = Image.open(image_path)
    iw, ih = img.size
    pad = Inches(0.12)
    inner_w = w - 2 * pad
    inner_h = h - 2 * pad - (Inches(0.32) if caption else 0)
    ratio = min(inner_w / Inches(iw / 96), inner_h / Inches(ih / 96))
    # use absolute EMU compare
    target_w_emu = int(min(inner_w, inner_h * (iw / ih)))
    target_h_emu = int(target_w_emu * ih / iw)
    if target_h_emu > inner_h:
        target_h_emu = int(inner_h)
        target_w_emu = int(target_h_emu * iw / ih)
    ix = x + (w - target_w_emu) // 2
    iy = y + pad + (inner_h - target_h_emu) // 2
    slide.shapes.add_picture(str(image_path), ix, iy, width=target_w_emu, height=target_h_emu)
    if caption:
        add_text(slide, x + pad, y + h - Inches(0.34), w - 2 * pad, Inches(0.28),
                 caption, size=10, color=MUTED, align=PP_ALIGN.CENTER)
    return card


def pill(slide, x, y, text, *, fill=ACCENT, color=WHITE, size=10, padding=0.12):
    """A small rounded pill."""
    # estimate width
    char_w = 0.075 * size / 10  # rough
    w = Inches(padding * 2 + max(0.6, len(text) * char_w))
    h = Inches(0.32)
    shp = add_round(slide, x, y, w, h, fill, radius=0.5)
    add_text(slide, x, y, w, h, text, size=size, bold=True, color=color,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    return w


# ---------- Slide builders ----------
TOTAL = 14
slides = []


def new_slide():
    s = prs.slides.add_slide(BLANK)
    slides.append(s)
    return s


# 01 — Cover
s = new_slide()
add_rect(s, 0, 0, W, H, INK)
# subtle accent rect
add_rect(s, 0, Inches(5.6), W, Inches(1.9), RGBColor(0x07, 0x16, 0x2B))
# vertical accent bar
add_rect(s, Inches(0.7), Inches(2.5), Inches(0.12), Inches(2.6), ACCENT)
# wordmark
add_text(s, Inches(0.95), Inches(1.0), Inches(6), Inches(0.5),
         "ORQENTIS", size=14, bold=True, color=ACCENT, font="Segoe UI Semibold")
add_text(s, Inches(0.95), Inches(2.35), Inches(11), Inches(1.4),
         "Data contracts, enforced.", size=54, bold=True, color=WHITE)
add_text(s, Inches(0.95), Inches(3.55), Inches(11), Inches(1.4),
         "The Microsoft Fabric–native control plane for ODCS v3.1.0.",
         size=22, color=RGBColor(0xC6, 0xD4, 0xE6))
add_text(s, Inches(0.95), Inches(4.55), Inches(11), Inches(0.5),
         "AI-assisted authoring · OneLake-deep enforcement · Activator-grade alerts",
         size=14, color=RGBColor(0x9E, 0xB2, 0xCC))
# pills
x = Inches(0.95); y = Inches(5.05)
for label, col in [("Microsoft Fabric ISV", ACCENT),
                   ("ODCS v3.1.0", TEAL),
                   ("AI-Native", AMBER),
                   ("Series Seed", CORAL)]:
    used = pill(s, x, y, label, fill=col, color=WHITE, size=10)
    x += used + Inches(0.15)
add_text(s, Inches(0.95), Inches(6.6), Inches(11), Inches(0.4),
         "Investor Deck · 2026 · Confidential",
         size=10, color=RGBColor(0x70, 0x86, 0xA2))


# 02 — The problem
s = new_slide()
page_chrome(s, "Every modern data team is silently broken by undeclared contracts.",
            eyebrow="The problem", page_num=2, total=TOTAL)
add_text(s, Inches(0.7), Inches(1.85), Inches(11.9), Inches(0.45),
         "Lakehouses run on tribal knowledge. Schemas drift. PII leaks. Dashboards lie. AI models train on bad data.",
         size=14, color=INK_SOFT)
# 3 columns
col_w = Inches(3.95); col_h = Inches(4.2); gap = Inches(0.15)
x0 = Inches(0.7); y0 = Inches(2.55)
problems = [
    ("$12.9M", "Average annual cost of bad data per enterprise (Gartner, 2023). 60% of AI projects stall on data quality.",
     CORAL),
    ("84%", "Data engineers say schema breakage is their #1 incident driver. Producers and consumers never sign an agreement.",
     AMBER),
    ("0", "Number of Fabric-native tools that enforce a portable ODCS contract on Delta tables. Until now.",
     ACCENT),
]
for i, (big, body, c) in enumerate(problems):
    x = x0 + i * (col_w + gap)
    add_round(s, x, y0, col_w, col_h, WHITE, line=LINE)
    add_rect(s, x, y0, col_w, Inches(0.12), c)
    add_text(s, x + Inches(0.3), y0 + Inches(0.5), col_w - Inches(0.6), Inches(1.6),
             big, size=54, bold=True, color=c)
    add_text(s, x + Inches(0.3), y0 + Inches(2.2), col_w - Inches(0.6), col_h - Inches(2.4),
             body, size=14, color=INK_SOFT)


# 03 — Why now
s = new_slide()
page_chrome(s, "Three tectonic shifts make this the moment.",
            eyebrow="Why now", page_num=3, total=TOTAL)
items = [
    ("Microsoft Fabric is the new center of gravity.",
     "Fabric crossed 19,000 paying enterprise customers in 2025 and ships with OneLake, the first universal multi-cloud data lake. Every Fortune 500 either runs it or evaluates it. The platform finally exposes a real workload SDK for ISVs."),
    ("ODCS v3.1.0 just standardised the contract.",
     "Bitol Foundation (Linux Foundation) shipped ODCS 3.1 in 2025: a portable YAML spec for schema, quality, SLA, security, and AI metadata. Adopted by JPMorgan, PayPal, Roche, AT&T. Replaces 10 proprietary catalog dialects."),
    ("Agentic AI demands provable data lineage.",
     "Regulators (EU AI Act, US NIST AI RMF) now require demonstrable provenance for any data used in AI. ‘Trust me, the dashboard is correct’ doesn’t pass an audit. Contracts are the audit artifact."),
]
y = Inches(1.95)
for i, (head, body) in enumerate(items):
    add_round(s, Inches(0.7), y, Inches(11.9), Inches(1.45), WHITE, line=LINE)
    add_rect(s, Inches(0.7), y, Inches(0.12), Inches(1.45), [ACCENT, TEAL, AMBER][i])
    add_text(s, Inches(1.0), y + Inches(0.18), Inches(11.5), Inches(0.4),
             head, size=16, bold=True, color=INK)
    add_text(s, Inches(1.0), y + Inches(0.68), Inches(11.5), Inches(0.75),
             body, size=12, color=INK_SOFT)
    y += Inches(1.6)


# 04 — Solution
s = new_slide()
page_chrome(s, "Orqentis is the Fabric-native ODCS enforcer.",
            eyebrow="Our solution", page_num=4, total=TOTAL)
add_text(s, Inches(0.7), Inches(1.85), Inches(11.9), Inches(0.5),
         "Author, evaluate, and enforce ODCS v3.1.0 contracts directly on OneLake Delta tables — without leaving Microsoft Fabric.",
         size=14, color=INK_SOFT)

pillars = [
    ("Author", "Monaco YAML with ODCS JSON-Schema IntelliSense, AI suggest from real samples, drift-aware reviews.", ACCENT),
    ("Evaluate", "Engine reads Delta logs over OneLake (OBO) and runs schema, quality, SLA, freshness, and PII rules in <60s.", TEAL),
    ("Enforce", "Block downstream pipelines, raise Activator alerts, write back violations as catalog tags — fully auditable.", AMBER),
    ("Explain", "AI agents translate violations into plain-English remediation tickets routed to Teams + Jira + ServiceNow.", CORAL),
]
col_w = Inches(2.95); col_h = Inches(3.9); gap = Inches(0.1)
x0 = Inches(0.7); y0 = Inches(2.7)
for i, (head, body, c) in enumerate(pillars):
    x = x0 + i * (col_w + gap)
    add_round(s, x, y0, col_w, col_h, WHITE, line=LINE)
    add_rect(s, x, y0, col_w, Inches(0.6), c)
    add_text(s, x, y0, col_w, Inches(0.6),
             head, size=18, bold=True, color=WHITE,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, x + Inches(0.3), y0 + Inches(0.85), col_w - Inches(0.6), col_h - Inches(1.0),
             body, size=12, color=INK_SOFT)


# 05 — Product: Fabric workload hub
s = new_slide()
page_chrome(s, "Native inside Microsoft Fabric — no portal-switching tax.",
            eyebrow="Product · Fabric integration", page_num=5, total=TOTAL)
add_text(s, Inches(0.7), Inches(1.85), Inches(7), Inches(0.5),
         "Orqentis ships as a first-class Fabric workload. Users discover, create, and govern contracts from the same hub where they author lakehouses and pipelines.",
         size=13, color=INK_SOFT)
add_bullets(s, Inches(0.7), Inches(3.0), Inches(5.4), Inches(3.5), [
    ("Workload hub.", "Listed alongside Lakehouse, Notebook, Pipeline."),
    ("Item types.", "Contract · Policy · Run · Report — each a Fabric item."),
    ("Workspace-aware.", "OBO tokens enforce existing Fabric RBAC."),
    ("Theme-aware.", "Inherits Fluent UI v9 tokens from the host portal."),
], size=13)
add_image_card(s, Inches(6.4), Inches(1.95), Inches(6.3), Inches(4.7),
               REPO / "fabric-live-test-screenshots" / "07-fabric-workload-hub.png",
               caption="Orqentis listed in the Microsoft Fabric workload hub")


# 06 — Product: Contract editor
s = new_slide()
page_chrome(s, "Author ODCS contracts with AI assistance, not a wiki page.",
            eyebrow="Product · Contract editor", page_num=6, total=TOTAL)
add_image_card(s, Inches(0.7), Inches(1.9), Inches(7.6), Inches(4.95),
               REPO / "frontend" / "public" / "images" / "screenshots" / "fabric-contract-editor.png",
               caption="ODCS YAML editor with live JSON-Schema validation and AI suggest")
add_bullets(s, Inches(8.6), Inches(2.1), Inches(4.2), Inches(4.5), [
    ("Monaco + ODCS schema.", "Autocomplete, hover docs, inline lint."),
    ("AI suggest.", "GPT-4o reads a sample of the target Delta table and proposes schema, quality, and PII rules."),
    ("Diff & review.", "Drift detection vs. the previous active contract version."),
    ("Multi-target.", "Lakehouse, Warehouse, Eventhouse, Semantic model, Fabric SQL."),
], size=13)


# 07 — Product: Enforcement run + Lakehouse
s = new_slide()
page_chrome(s, "Enforcement runs in <60s, with explainable violations.",
            eyebrow="Product · Enforcement", page_num=7, total=TOTAL)
add_image_card(s, Inches(0.7), Inches(1.95), Inches(6.0), Inches(4.85),
               REPO / "fabric-live-test-screenshots" / "45-run-now-final.png",
               caption="Run-now: schema, quality, freshness, PII results in one view")
add_image_card(s, Inches(6.85), Inches(1.95), Inches(6.0), Inches(4.85),
               REPO / "fabric-live-test-screenshots" / "50-lakehouse-more-data.png",
               caption="Delta table on OneLake — evaluated in-place, no data movement")


# 08 — Product: Policies, Reports, Alerts
s = new_slide()
page_chrome(s, "Policies, reports, and Activator-grade alerts.",
            eyebrow="Product · Governance", page_num=8, total=TOTAL)
add_image_card(s, Inches(0.5), Inches(1.95), Inches(4.15), Inches(4.85),
               REPO / "fabric-live-test-screenshots" / "30b-policy-wizard-clean.png",
               caption="Policy wizard — block, warn, or quarantine on violation")
add_image_card(s, Inches(4.78), Inches(1.95), Inches(4.15), Inches(4.85),
               REPO / "frontend" / "public" / "images" / "screenshots" / "fabric-contract-report.png",
               caption="Contract report — drill-down by table, rule, run")
add_image_card(s, Inches(9.05), Inches(1.95), Inches(4.0), Inches(4.85),
               REPO / "frontend" / "public" / "images" / "screenshots" / "alerts-dashboard.png",
               caption="Alerts dashboard with Activator + Teams + Jira routing")


# 09 — How it works
s = new_slide()
page_chrome(s, "How it works.",
            eyebrow="Architecture", page_num=9, total=TOTAL)
# row of boxes
boxes = [
    ("Fabric Portal", "React 18 · Fluent v9\n@ms-fabric/workload-client", ACCENT),
    ("Orqentis API", ".NET 8 · ASP.NET Core\nEF Core · Hangfire", ACCENT_DARK),
    ("Engine + AI", "ODCS validator\nAzure OpenAI GPT-4o\nClaude 3.7 fallback", TEAL),
    ("OneLake (Delta)", "OBO token\nDelta log reader\nZero data movement", AMBER),
    ("Activator + Teams", "Webhooks\nJira · ServiceNow\nAudit log", CORAL),
]
bw = Inches(2.35); bh = Inches(2.0); y = Inches(2.4)
x = Inches(0.5)
for i, (head, body, c) in enumerate(boxes):
    add_round(s, x, y, bw, bh, WHITE, line=LINE)
    add_rect(s, x, y, bw, Inches(0.45), c)
    add_text(s, x, y, bw, Inches(0.45), head, size=13, bold=True, color=WHITE,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, x + Inches(0.18), y + Inches(0.55), bw - Inches(0.36), bh - Inches(0.6),
             body, size=11, color=INK_SOFT)
    if i < len(boxes) - 1:
        # arrow
        arr = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW,
                                 x + bw + Inches(0.02), y + bh / 2 - Inches(0.12),
                                 Inches(0.25), Inches(0.24))
        arr.fill.solid(); arr.fill.fore_color.rgb = INK_SOFT
        arr.line.fill.background()
    x += bw + Inches(0.27)
# bottom band of guarantees
y2 = Inches(4.85)
add_round(s, Inches(0.5), y2, Inches(12.35), Inches(1.95), PAPER, line=LINE)
add_text(s, Inches(0.85), y2 + Inches(0.18), Inches(11), Inches(0.4),
         "Built-in guarantees", size=13, bold=True, color=INK)
guarantees = [
    "OBO-only OneLake access — application identity is forbidden on the data plane.",
    "Soft-delete + UTC + correlation-id on every API call, log, and webhook.",
    "ODCS v3.1.0 JSON-Schema validator is authoritative; nothing persists active without passing.",
    "All LLM calls wrapped in 15s timeout + 3-retry Polly + empty-template fallback.",
]
add_bullets(s, Inches(0.85), y2 + Inches(0.6), Inches(11.5), Inches(1.3), guarantees, size=11)


# 10 — Differentiation
s = new_slide()
page_chrome(s, "Why Orqentis wins where catalogs fail.",
            eyebrow="Differentiation", page_num=10, total=TOTAL)
headers = ["Capability", "Purview", "Collibra", "Informatica", "Open-source\n(Soda, Great Expectations)", "Orqentis"]
rows = [
    ["Fabric-native (OneLake OBO)",         "Partial", "No",      "No",      "No",       "Yes"],
    ["ODCS v3.1.0 portable contracts",      "No",      "No",      "No",      "Partial",  "Yes"],
    ["AI suggest from real Delta sample",   "No",      "No",      "No",      "No",       "Yes"],
    ["Block-on-violation enforcement",      "No",      "No",      "Partial", "Partial",  "Yes"],
    ["Activator + Teams + Jira routing",    "No",      "No",      "No",      "No",       "Yes"],
    ["Time-to-first-contract",              "Weeks",   "Weeks",   "Months",  "Days",     "Minutes"],
]
cols = 6
table_x = Inches(0.55); table_y = Inches(2.0)
col_widths = [Inches(3.2), Inches(1.4), Inches(1.4), Inches(1.55), Inches(2.6), Inches(1.55)]
row_h = Inches(0.55)
# header
x = table_x
for i, head in enumerate(headers):
    add_rect(s, x, table_y, col_widths[i], row_h, INK)
    add_text(s, x, table_y, col_widths[i], row_h, head, size=10.5, bold=True,
             color=WHITE, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    x += col_widths[i]
# rows
y = table_y + row_h
for r_i, row in enumerate(rows):
    x = table_x
    band = PAPER if r_i % 2 == 0 else WHITE
    for c_i, cell in enumerate(row):
        add_rect(s, x, y, col_widths[c_i], row_h, band, line=LINE)
        color = INK
        bold = False
        if c_i == cols - 1:
            color = ACCENT_DARK
            bold = True
        elif cell == "No":
            color = CORAL
        elif cell == "Yes":
            color = TEAL; bold = True
        elif cell == "Partial":
            color = AMBER
        align = PP_ALIGN.LEFT if c_i == 0 else PP_ALIGN.CENTER
        pad = Inches(0.15) if c_i == 0 else 0
        add_text(s, x + pad, y, col_widths[c_i] - pad, row_h, cell,
                 size=11, bold=bold, color=color,
                 align=align, anchor=MSO_ANCHOR.MIDDLE)
        x += col_widths[c_i]
    y += row_h


# 11 — Market
s = new_slide()
page_chrome(s, "A $14B governance market, with Fabric as the wedge.",
            eyebrow="Market", page_num=11, total=TOTAL)
# left: TAM/SAM/SOM
def market_block(slide, x, y, w, h, top, value, label, color):
    add_round(slide, x, y, w, h, WHITE, line=LINE)
    add_rect(slide, x, y, w, Inches(0.12), color)
    add_text(slide, x + Inches(0.3), y + Inches(0.4), w - Inches(0.6), Inches(0.4),
             top, size=11, bold=True, color=color)
    add_text(slide, x + Inches(0.3), y + Inches(0.85), w - Inches(0.6), Inches(1.2),
             value, size=36, bold=True, color=INK)
    add_text(slide, x + Inches(0.3), y + Inches(2.05), w - Inches(0.6), Inches(0.8),
             label, size=11, color=INK_SOFT)

market_block(s, Inches(0.7),  Inches(2.0), Inches(3.9), Inches(3.05),
             "TAM", "$14.1B",
             "Global data governance + observability + catalog software, 2027 (IDC, Gartner blend).", ACCENT)
market_block(s, Inches(4.7),  Inches(2.0), Inches(3.9), Inches(3.05),
             "SAM", "$3.6B",
             "Enterprises standardised on Microsoft Fabric / OneLake, 19k+ orgs and growing 60% YoY.", TEAL)
market_block(s, Inches(8.7),  Inches(2.0), Inches(3.9), Inches(3.05),
             "SOM (5 yr)", "$220M",
             "Top 2,000 Fabric tenants at $110k ACV — conservative 6% penetration via Marketplace + MS co-sell.", AMBER)

# bottom: GTM funnel
add_round(s, Inches(0.7), Inches(5.25), Inches(11.9), Inches(1.7), PAPER, line=LINE)
add_text(s, Inches(1.0), Inches(5.4), Inches(11), Inches(0.4),
         "Go-to-market", size=13, bold=True, color=INK)
gtm = [
    ("Fabric Marketplace", "1-click install, transactable, MACC-eligible (Microsoft Azure Consumption Commitment)."),
    ("Co-sell with Microsoft", "Aligned to Fabric ISV motion; Field Engagement program qualified."),
    ("PLG → enterprise", "Free contract authoring, paid enforcement + AI suggest + audit retention."),
]
y = Inches(5.85)
for i, (h, b) in enumerate(gtm):
    x = Inches(1.0) + i * Inches(4.0)
    add_text(s, x, y, Inches(3.8), Inches(0.3), h, size=11.5, bold=True, color=ACCENT_DARK)
    add_text(s, x, y + Inches(0.32), Inches(3.8), Inches(0.7), b, size=10.5, color=INK_SOFT)


# 12 — Traction
s = new_slide()
page_chrome(s, "Shipped, green, and Marketplace-ready.",
            eyebrow="Traction", page_num=12, total=TOTAL)
# metric tiles
metrics = [
    ("263", "backend tests passing", TEAL),
    ("93.8%", "frontend coverage in critical paths", ACCENT),
    ("ODCS 3.1.0", "schema-validated, end-to-end", AMBER),
    ("Pixel-perfect", "Fluent v9, principal-designer reviewed", CORAL),
]
x = Inches(0.7); y = Inches(2.0); w = Inches(2.9); h = Inches(1.55); gap = Inches(0.15)
for big, lbl, c in metrics:
    add_round(s, x, y, w, h, WHITE, line=LINE)
    add_rect(s, x, y, Inches(0.1), h, c)
    add_text(s, x + Inches(0.25), y + Inches(0.18), w - Inches(0.4), Inches(0.7),
             big, size=30, bold=True, color=c)
    add_text(s, x + Inches(0.25), y + Inches(0.95), w - Inches(0.4), Inches(0.5),
             lbl, size=11, color=INK_SOFT)
    x += w + gap

# milestones list
y = Inches(3.85)
add_round(s, Inches(0.7), y, Inches(11.9), Inches(3.05), WHITE, line=LINE)
add_text(s, Inches(1.0), y + Inches(0.2), Inches(11), Inches(0.4),
         "Recent milestones", size=13, bold=True, color=INK)
ms = [
    ("UI / UX overhaul", "Pixel-perfect Fluent UI v9 sweep across every page — Fabric portal indistinguishable."),
    ("CI green for the first time in months", "Resolved 7 pre-existing pipeline gates (CSP, lint, dotnet format, trivy, NuGet vulns, coverage, Bicep drift)."),
    ("Data Security for AI",  "Differentiation map vs Purview/Collibra/Informatica; PII classifier wired to AI suggest."),
    ("Complex scenarios suite", "ODCS contracts validated end-to-end on real customer-shape data (knowledge graphs, ontologies, multi-table entities)."),
    ("Live Fabric workload",   "Listed in workload hub; OBO-authenticated; contract → run → report flow demoable today."),
]
add_bullets(s, Inches(1.0), y + Inches(0.65), Inches(11.4), Inches(2.4), ms, size=11.5)


# 13 — Roadmap
s = new_slide()
page_chrome(s, "Where the next four quarters take us.",
            eyebrow="Roadmap", page_num=13, total=TOTAL)
phases = [
    ("Now",   "GA on Fabric Marketplace",
     ["ODCS 3.1 enforcement (Lakehouse, Warehouse, SQL)",
      "AI suggest + Activator alerts",
      "Audit log + RBAC parity with Fabric",
      "Co-sell readiness pack"], ACCENT),
    ("Next",  "Enterprise scale",
     ["Eventhouse / KQL contracts",
      "Cross-tenant contract sharing",
      "Quarantine + auto-remediate",
      "SOC 2 Type II"], TEAL),
    ("Later", "Platform",
     ["Open contract registry (federated)",
      "Contract-as-code GitHub action",
      "Multi-cloud (Databricks Unity, Snowflake) via ODCS",
      "Agentic remediation copilot"], AMBER),
]
x = Inches(0.7); y = Inches(2.0); w = Inches(3.95); h = Inches(4.7); gap = Inches(0.15)
for label, headline, items, c in phases:
    add_round(s, x, y, w, h, WHITE, line=LINE)
    add_rect(s, x, y, w, Inches(0.6), c)
    add_text(s, x, y, w, Inches(0.6), label, size=14, bold=True, color=WHITE,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    add_text(s, x + Inches(0.3), y + Inches(0.85), w - Inches(0.6), Inches(0.5),
             headline, size=14, bold=True, color=INK)
    add_bullets(s, x + Inches(0.3), y + Inches(1.5), w - Inches(0.6), h - Inches(1.7),
                items, size=11.5, bullet_color=c)
    x += w + gap


# 14 — The ask
s = new_slide()
page_chrome(s, "The ask.",
            eyebrow="Funding", page_num=14, total=TOTAL, bg=INK,
            footer="Orqentis  |  Investor Deck  |  Confidential")
# repaint chrome dark
# overwrite title color manually: re-add labels in white
# (page_chrome painted on INK already; rewrite eyebrow + title in light)
# Add bigger ask
add_text(s, Inches(0.7), Inches(0.65), Inches(8), Inches(0.3),
         "FUNDING", size=10, bold=True, color=RGBColor(0x6F, 0xB1, 0xF0))
add_text(s, Inches(0.7), Inches(0.92), Inches(11), Inches(0.7),
         "The ask.", size=28, bold=True, color=WHITE)
add_round(s, Inches(0.7), Inches(2.0), Inches(5.6), Inches(4.4),
          RGBColor(0x0F, 0x2A, 0x4D), line=ACCENT)
add_text(s, Inches(1.0), Inches(2.2), Inches(5.0), Inches(0.5),
         "Seed round", size=14, bold=True, color=ACCENT)
add_text(s, Inches(1.0), Inches(2.65), Inches(5.0), Inches(1.1),
         "$4M", size=72, bold=True, color=WHITE)
add_text(s, Inches(1.0), Inches(4.05), Inches(5.0), Inches(0.4),
         "18-month runway to Fabric Marketplace GA + 25 paying logos.",
         size=13, color=RGBColor(0xC6, 0xD4, 0xE6))
add_bullets(s, Inches(1.0), Inches(4.55), Inches(5.0), Inches(1.8), [
    ("40%", "Engineering — close Eventhouse + remediation copilot."),
    ("30%", "Go-to-market — Microsoft co-sell + Marketplace listing."),
    ("20%", "Security & compliance — SOC 2 Type II."),
    ("10%", "Design partnerships with 3 Fortune-100 Fabric tenants."),
], size=11.5, color=WHITE, bullet_color=ACCENT)

# right: contact + thesis
add_text(s, Inches(7.0), Inches(2.2), Inches(5.6), Inches(0.5),
         "WHY US, WHY NOW", size=11, bold=True, color=ACCENT)
add_bullets(s, Inches(7.0), Inches(2.7), Inches(5.7), Inches(3.0), [
    ("First-mover.", "The only Fabric-native ODCS enforcer in market."),
    ("Standards moat.", "Bitol/ODCS committer access; we shape the spec."),
    ("Microsoft alignment.", "Built on the Fabric Extensibility Toolkit since day one."),
    ("Pixel-perfect product.", "Live, demoable, principal-designer validated."),
], size=12, color=WHITE, bullet_color=ACCENT)
add_text(s, Inches(7.0), Inches(5.7), Inches(5.6), Inches(0.4),
         "Contact",
         size=11, bold=True, color=ACCENT)
add_text(s, Inches(7.0), Inches(6.1), Inches(5.6), Inches(0.4),
         "founders@orqentis.io  ·  orqentis.io",
         size=14, bold=True, color=WHITE)

# Save
OUT.parent.mkdir(parents=True, exist_ok=True)
prs.save(OUT)
print(f"Wrote {OUT}  ({OUT.stat().st_size/1024:.1f} KB)")
