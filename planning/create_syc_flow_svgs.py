from __future__ import annotations

from pathlib import Path
from textwrap import wrap


OUT_DIR = Path(__file__).parent
FONT = "Arial, sans-serif"


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def text_block(x: int, y: int, text: str, size: int = 12, weight: str = "400", color: str = "#0F172A", width: int = 28) -> str:
    lines = wrap(text, width=width)
    out = []
    for i, line in enumerate(lines):
        out.append(
            f'<text x="{x}" y="{y + i * (size + 4)}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" fill="{color}">{esc(line)}</text>'
        )
    return "\n".join(out)


def box(x: int, y: int, w: int, h: int, title: str, body: str, fill: str = "#FFFFFF", stroke: str = "#CBD5E1") -> str:
    return "\n".join(
        [
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>',
            text_block(x + 14, y + 24, title, 13, "700", "#0F172A", max(18, w // 8)),
            text_block(x + 14, y + 50, body, 11, "400", "#475569", max(20, w // 7)),
        ]
    )


def arrow(x1: int, y1: int, x2: int, y2: int, label: str = "", color: str = "#475569") -> str:
    mid_x = (x1 + x2) / 2
    mid_y = (y1 + y2) / 2
    bits = [
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.6" marker-end="url(#arrow)"/>'
    ]
    if label:
        bits.append(
            f'<text x="{mid_x + 6:.1f}" y="{mid_y - 6:.1f}" font-family="{FONT}" font-size="10" fill="{color}">{esc(label)}</text>'
        )
    return "\n".join(bits)


def elbow(points: list[tuple[int, int]], label: str = "", color: str = "#475569") -> str:
    if len(points) < 2:
        raise ValueError("elbow connector requires at least two points")
    path = " ".join(
        f"{'M' if i == 0 else 'L'} {x} {y}" for i, (x, y) in enumerate(points)
    )
    bits = [
        f'<path d="{path}" fill="none" stroke="{color}" stroke-width="1.6" marker-end="url(#arrow)"/>'
    ]
    if label:
        x, y = points[len(points) // 2]
        bits.append(
            f'<text x="{x + 6}" y="{y - 6}" font-family="{FONT}" font-size="10" fill="{color}">{esc(label)}</text>'
        )
    return "\n".join(bits)


def header(title: str, subtitle: str, width: int, height: int) -> list[str]:
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#475569"/></marker></defs>',
        '<rect width="100%" height="100%" fill="#F8FAFC"/>',
        f'<text x="40" y="44" font-family="{FONT}" font-size="24" font-weight="700" fill="#0F172A">{esc(title)}</text>',
        f'<text x="40" y="70" font-family="{FONT}" font-size="13" fill="#475569">{esc(subtitle)}</text>',
    ]


def agentic_swimlane() -> str:
    width, height = 1320, 820
    lanes = [
        ("Case Officer", "#EFF6FF"),
        ("SYC Portal", "#F0FDFA"),
        ("Agent Orchestrator", "#F5F3FF"),
        ("AI + Tool Services", "#FFF7ED"),
        ("Data Stores", "#F8FAFC"),
        ("Approver + D365", "#FFF1F2"),
    ]
    lines = header(
        "Agentic Orchestration Swimlane",
        "Session-scoped assistant flow with explicit approval before D365 on-prem write-back",
        width,
        height,
    )
    top, lane_h = 100, 108
    for i, (name, fill) in enumerate(lanes):
        y = top + i * lane_h
        lines.append(f'<rect x="40" y="{y}" width="1240" height="{lane_h}" fill="{fill}" stroke="#CBD5E1"/>')
        lines.append(f'<text x="56" y="{y + 32}" font-family="{FONT}" font-size="13" font-weight="700" fill="#334155">{esc(name)}</text>')

    steps = [
        (210, top + 16, "Start Case", "Officer opens case intake and uploads supporting documents.", "#FFFFFF"),
        (430, top + lane_h + 16, "Submit Draft", "Portal sends case draft, files, and session ID to backend APIs.", "#FFFFFF"),
        (650, top + lane_h * 2 + 16, "Plan Work", "Orchestrator creates run, selects tools, and generates action cards.", "#FFFFFF"),
        (870, top + lane_h * 3 + 16, "Extract + Validate", "OCR, model calls, rules, and service lookups produce findings.", "#FFFFFF"),
        (1090, top + lane_h * 4 + 16, "Persist Metadata", "Store case data, documents, hashes, tool runs, and findings.", "#FFFFFF"),
        (650, top + lane_h + 16, "Review Findings", "Portal shows extracted values, exceptions, and confidence signals.", "#FFFFFF"),
        (430, top + 16, "Confirm Action", "Officer edits values and submits approval request.", "#FFFFFF"),
        (650, top + lane_h * 5 + 16, "Approve", "Approver records decision; approved cases continue to D365.", "#FFFFFF"),
        (910, top + lane_h * 5 + 16, "Create in D365", "Approved payload is inserted through secured on-prem integration.", "#FFFFFF"),
        (1090, top + lane_h + 16, "Show Result", "Portal displays D365 reference, status, and audit trail.", "#FFFFFF"),
    ]
    for x, y, title, body, fill in steps:
        lines.append(box(x, y, 170, 76, title, body, fill))

    connectors = [
        ([(380, top + 54), (405, top + 54), (405, top + lane_h + 54), (430, top + lane_h + 54)], "draft"),
        ([(600, top + lane_h + 54), (625, top + lane_h + 54), (625, top + lane_h * 2 + 54), (650, top + lane_h * 2 + 54)], "orchestrate"),
        ([(820, top + lane_h * 2 + 54), (845, top + lane_h * 2 + 54), (845, top + lane_h * 3 + 54), (870, top + lane_h * 3 + 54)], "tools"),
        ([(1040, top + lane_h * 3 + 54), (1065, top + lane_h * 3 + 54), (1065, top + lane_h * 4 + 54), (1090, top + lane_h * 4 + 54)], "metadata"),
        ([(1090, top + lane_h * 4 + 70), (1065, top + lane_h * 4 + 70), (1065, top + lane_h + 70), (820, top + lane_h + 70)], "results"),
        ([(650, top + lane_h + 38), (625, top + lane_h + 38), (625, top + 54), (600, top + 54)], "review"),
        ([(600, top + 54), (625, top + 54), (625, top + lane_h * 5 + 46), (650, top + lane_h * 5 + 46)], "approval"),
        ([(820, top + lane_h * 5 + 54), (910, top + lane_h * 5 + 54)], "approved"),
        ([(1080, top + lane_h * 5 + 54), (1085, top + lane_h * 5 + 54), (1085, top + lane_h + 54), (1090, top + lane_h + 54)], "status"),
    ]
    for points, label in connectors:
        lines.append(elbow(points, label))
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def user_logic_flow() -> str:
    width, height = 1180, 760
    lines = header(
        "User Logic Flow",
        "Officer-facing flow from login to case creation and D365 status confirmation",
        width,
        height,
    )
    nodes = [
        (70, 130, "Sign In", "User authenticates through Entra ID and lands in the SYC portal.", "#FFFFFF"),
        (320, 130, "Choose Action", "Create new case or search an existing case based on RBAC.", "#FFFFFF"),
        (570, 130, "Enter Case Data", "Complete intake fields with validation and autosave.", "#FFFFFF"),
        (820, 130, "Upload Documents", "Upload supporting documents and receive processing status.", "#FFFFFF"),
        (820, 310, "Review AI Output", "Check extracted values, exceptions, confidence, and suggested actions.", "#FFFFFF"),
        (570, 310, "Correct and Confirm", "Edit values, resolve flags, and explicitly confirm next action.", "#FFFFFF"),
        (320, 310, "Submit Approval", "Route case to configured approver group with comments.", "#FFFFFF"),
        (70, 310, "Approval Decision", "Approver approves or rejects with reason and timestamp.", "#FFFFFF"),
        (70, 500, "Rejected", "Case returns to officer for correction or closure.", "#FEF2F2"),
        (320, 500, "Approved", "Backend locks approved payload for write-back.", "#ECFDF5"),
        (570, 500, "Create D365 Case", "System inserts approved case into D365 on-prem.", "#FFFFFF"),
        (820, 500, "Track Outcome", "Portal shows D365 reference, failure reason, and audit events.", "#FFFFFF"),
    ]
    for x, y, title, body, fill in nodes:
        lines.append(box(x, y, 190, 96, title, body, fill))
    for args in [
        (260, 178, 320, 178, ""),
        (510, 178, 570, 178, ""),
        (760, 178, 820, 178, ""),
        (915, 226, 915, 310, "processed"),
        (820, 358, 760, 358, ""),
        (570, 358, 510, 358, ""),
        (320, 358, 260, 358, ""),
        (165, 406, 165, 500, "reject"),
        (510, 548, 570, 548, ""),
        (760, 548, 820, 548, ""),
    ]:
        lines.append(arrow(*args))
    for points, label in [
        ([(260, 358), (290, 358), (290, 548), (320, 548)], "approve"),
        ([(70, 548), (40, 548), (40, 96), (665, 96), (665, 130)], "resubmit after correction"),
    ]:
        lines.append(elbow(points, label))
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def communication_diagram() -> str:
    width, height = 1360, 860
    lines = header(
        "Production Communication Diagram",
        "Azure production services, existing services, and secured on-prem D365 integration",
        width,
        height,
    )
    groups = [
        (40, 110, 300, 670, "User + Existing Estate", "#EEF2FF"),
        (380, 110, 610, 670, "Azure Production Landing Zone", "#ECFEFF"),
        (1030, 110, 290, 670, "On-Prem / Enterprise", "#FFF7ED"),
    ]
    for x, y, w, h, title, fill in groups:
        lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="#CBD5E1"/>')
        lines.append(f'<text x="{x + 18}" y="{y + 30}" font-family="{FONT}" font-size="14" font-weight="700" fill="#334155">{esc(title)}</text>')

    components = [
        (80, 170, 210, 74, "Case Officer", "Browser access to upgraded SYC portal", "#FFFFFF"),
        (80, 300, 210, 74, "Existing SYC Portal", "JavaScript portal upgraded for production", "#FFFFFF"),
        (80, 430, 210, 74, "Enterprise IdP", "Entra ID / enterprise identity route", "#FFFFFF"),
        (420, 160, 230, 76, "API Management", "Gateway policies, auth, routing, throttling", "#FFFFFF"),
        (720, 160, 230, 76, "Portal + Backend Apps", "SYC UI, APIs, orchestration endpoints", "#FFFFFF"),
        (420, 300, 230, 76, "Agent Orchestrator", "Session, tool routing, approval guardrails", "#FFFFFF"),
        (720, 300, 230, 76, "AI / Tool Services", "OCR, extraction, validation, model calls", "#FFFFFF"),
        (420, 440, 230, 76, "Azure PostgreSQL", "Case, audit, approval, tool metadata", "#FFFFFF"),
        (720, 440, 230, 76, "Storage Account", "Uploads, processing artifacts, logs", "#FFFFFF"),
        (420, 580, 230, 76, "Key Vault", "Secrets, keys, certificates per environment", "#FFFFFF"),
        (720, 580, 230, 76, "Monitor + Alerts", "Dashboards, logs, operational alerts", "#FFFFFF"),
        (1065, 190, 210, 76, "D365 On-Prem", "Approved case insert and status result", "#FFFFFF"),
        (1065, 350, 210, 76, "Notification Service", "Submission, approval, and failure alerts", "#FFFFFF"),
        (1065, 510, 210, 76, "ShipHat / Azure DevOps", "CI/CD, code scans, environment gates", "#FFFFFF"),
    ]
    for x, y, w, h, title, body, fill in components:
        lines.append(box(x, y, w, h, title, body, fill))

    for args in [
        (650, 198, 720, 198, "routed API"),
        (650, 338, 720, 338, "tool calls"),
        (535, 376, 535, 440, "metadata"),
        (835, 376, 835, 440, "files"),
        (535, 580, 535, 516, "secrets"),
        (835, 516, 835, 580, "logs"),
        (650, 618, 720, 618, "telemetry"),
    ]:
        lines.append(arrow(*args))
    for points, label in [
        ([(290, 207), (355, 207), (355, 198), (420, 198)], "HTTPS"),
        ([(290, 337), (355, 337), (355, 198), (420, 198)], "API calls"),
        ([(185, 430), (60, 430), (60, 265), (185, 265), (185, 244)], "OIDC"),
        ([(835, 236), (835, 270), (535, 270), (535, 300)], "case task"),
        ([(950, 338), (1000, 338), (1000, 228), (1065, 228)], "approved payload"),
        ([(1065, 388), (1000, 388), (1000, 338), (950, 338)], "alerts"),
        ([(1065, 548), (1000, 548), (1000, 618), (950, 618)], "deploy gates"),
    ]:
        lines.append(elbow(points, label))

    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def main() -> None:
    outputs = {
        "syc_agentic_orchestration_swimlane.svg": agentic_swimlane(),
        "syc_user_logic_flow.svg": user_logic_flow(),
        "syc_communication_diagram.svg": communication_diagram(),
    }
    for name, content in outputs.items():
        path = OUT_DIR / name
        path.write_text(content, encoding="utf-8")
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
