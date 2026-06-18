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


def text_block(
    x: int,
    y: int,
    text: str,
    size: int = 12,
    weight: str = "400",
    color: str = "#0F172A",
    width: int = 30,
) -> str:
    return "\n".join(
        f'<text x="{x}" y="{y + i * (size + 4)}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" fill="{color}">{esc(line)}</text>'
        for i, line in enumerate(wrap(text, width=width))
    )


def box(
    x: int,
    y: int,
    w: int,
    h: int,
    title: str,
    body: str,
    fill: str = "#FFFFFF",
    stroke: str = "#CBD5E1",
) -> str:
    return "\n".join(
        [
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>',
            text_block(x + 14, y + 25, title, 13, "700", "#0F172A", max(18, w // 8)),
            text_block(x + 14, y + 52, body, 11, "400", "#475569", max(20, w // 7)),
        ]
    )


def group(x: int, y: int, w: int, h: int, title: str, fill: str) -> str:
    return "\n".join(
        [
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="#CBD5E1" stroke-width="1.2"/>',
            f'<text x="{x + 18}" y="{y + 30}" font-family="{FONT}" font-size="14" font-weight="700" fill="#334155">{esc(title)}</text>',
        ]
    )


def elbow(points: list[tuple[int, int]], label: str = "", color: str = "#475569") -> str:
    path = " ".join(
        f"{'M' if i == 0 else 'L'} {x} {y}" for i, (x, y) in enumerate(points)
    )
    bits = [
        f'<path d="{path}" fill="none" stroke="{color}" stroke-width="1.7" marker-end="url(#arrow)"/>'
    ]
    if label:
        x, y = points[len(points) // 2]
        bits.append(
            f'<text x="{x + 7}" y="{y - 7}" font-family="{FONT}" font-size="10" fill="{color}">{esc(label)}</text>'
        )
    return "\n".join(bits)


def header(title: str, subtitle: str, width: int, height: int) -> list[str]:
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#475569"/></marker></defs>',
        '<rect width="100%" height="100%" fill="#F8FAFC"/>',
        f'<text x="42" y="46" font-family="{FONT}" font-size="25" font-weight="700" fill="#0F172A">{esc(title)}</text>',
        f'<text x="42" y="73" font-family="{FONT}" font-size="13" fill="#475569">{esc(subtitle)}</text>',
    ]


def high_level_architecture() -> str:
    width, height = 1320, 760
    lines = header(
        "SYC High-Level Solution Architecture",
        "Production Azure architecture covering portal upgrade, agentic orchestration, approval, and D365 on-prem creation",
        width,
        height,
    )

    groups = [
        (40, 108, 260, 548, "Users and Existing Estate", "#EEF2FF"),
        (340, 108, 590, 548, "Azure Production Platform", "#ECFEFF"),
        (970, 108, 300, 548, "Enterprise / On-Prem", "#FFF7ED"),
    ]
    lines.extend(group(*g) for g in groups)

    connectors = [
        ([(260, 210), (340, 210)], "HTTPS"),
        ([(260, 330), (340, 210)], "API"),
        ([(260, 450), (310, 450), (310, 210), (340, 210)], "OIDC"),
        ([(560, 210), (610, 210)], "route"),
        ([(800, 210), (830, 210), (830, 330), (800, 330)], "orchestrate"),
        ([(610, 330), (560, 330)], "case data"),
        ([(700, 390), (700, 455)], "persist"),
        ([(800, 330), (830, 330), (830, 455), (800, 455)], "files + logs"),
        ([(560, 510), (610, 510)], "secrets"),
        ([(800, 510), (830, 510), (830, 610), (800, 610)], "telemetry"),
        ([(800, 330), (970, 250)], "approved case"),
        ([(970, 375), (800, 330)], "notify"),
        ([(970, 520), (820, 610)], "release gates"),
    ]
    lines.extend(elbow(points, label) for points, label in connectors)

    boxes = [
        (80, 175, 180, 70, "Case Officers", "Use upgraded SYC portal for intake, review, and approval actions."),
        (80, 295, 180, 70, "Existing SYC Portal", "JavaScript portal upgraded for Azure-backed production APIs."),
        (80, 415, 180, 70, "Enterprise Identity", "Entra ID authentication and RBAC group mapping."),
        (340, 175, 220, 70, "API Management", "Gateway, policies, JWT checks, throttling, backend routing."),
        (610, 175, 190, 70, "Portal + Backend", "Production app services for UI, APIs, and case operations."),
        (610, 295, 190, 95, "Agent Orchestrator", "Session-scoped planner, tool routing, action cards, approval guardrails."),
        (340, 295, 220, 95, "Azure PostgreSQL", "Case records, approvals, audit events, tool runs, findings metadata."),
        (610, 455, 190, 70, "Storage Account", "Uploaded documents, generated artifacts, diagnostic logs."),
        (340, 475, 220, 70, "Key Vault", "Secrets, certs, managed identity access for each environment."),
        (610, 595, 190, 70, "Monitor + Alerts", "Operational dashboards, alerts, release and runtime diagnostics."),
        (970, 210, 220, 80, "D365 On-Prem", "Approved case insert, response capture, retry and status handling."),
        (970, 340, 220, 70, "Notification Service", "Submission, approval, and exception notifications."),
        (970, 485, 220, 80, "ShipHat / Azure DevOps", "CI/CD promotion, approvals, code scan gates."),
    ]
    lines.extend(box(*b) for b in boxes)
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def detailed_architecture() -> str:
    width, height = 1560, 980
    lines = header(
        "SYC Detailed Solution Architecture",
        "Detailed production component view for DEV, UAT, PROD promotion, secured Azure services, agent orchestration, and enterprise integrations",
        width,
        height,
    )

    envs = [
        (70, 105, 430, "DEV", "#DBEAFE"),
        (560, 105, 430, "UAT", "#DCFCE7"),
        (1050, 105, 430, "PROD", "#FFE4E6"),
    ]
    for x, y, w, name, fill in envs:
        lines.append(group(x, y, w, 68, name, fill))
        lines.append(
            f'<text x="{x + 78}" y="{y + 48}" font-family="{FONT}" font-size="12" fill="#475569">same resource pattern, environment-specific config and approval gates</text>'
        )

    groups = [
        (40, 205, 300, 660, "Client and Access", "#EEF2FF"),
        (380, 205, 430, 660, "Azure Application Layer", "#ECFEFF"),
        (850, 205, 330, 660, "AI, Data, and Security", "#F5F3FF"),
        (1220, 205, 300, 660, "Enterprise Services", "#FFF7ED"),
    ]
    lines.extend(group(*g) for g in groups)

    connectors = [
        ([(300, 300), (380, 300)], "HTTPS"),
        ([(300, 415), (340, 415), (340, 300), (380, 300)], "OIDC"),
        ([(590, 300), (620, 300)], "routed APIs"),
        ([(620, 360), (590, 360), (590, 475), (620, 475)], "orchestrate"),
        ([(810, 475), (850, 475)], "model/tool calls"),
        ([(715, 550), (715, 625), (850, 625)], "case + audit"),
        ([(715, 550), (715, 745), (850, 745)], "documents"),
        ([(620, 745), (590, 745), (590, 805), (850, 805)], "logs"),
        ([(850, 360), (810, 360), (810, 300), (850, 300)], "secrets"),
        ([(1180, 475), (1220, 300)], "approved payload"),
        ([(1220, 415), (1180, 475)], "alerts"),
        ([(1220, 545), (1180, 625)], "network route"),
        ([(1220, 745), (1180, 805)], "deployments"),
        ([(1480, 745), (1480, 890), (590, 890), (590, 840)], "promote DEV to UAT to PROD"),
    ]
    lines.extend(elbow(points, label) for points, label in connectors)

    boxes = [
        (80, 265, 220, 78, "Case Officer Browser", "Portal access for intake, upload, review, approval request, and status tracking."),
        (80, 380, 220, 78, "Entra ID + RBAC", "Enterprise authentication, role groups, least-privilege portal access."),
        (80, 500, 220, 92, "Existing SYC Portal Upgrade", "JavaScript portal shell, forms, search, detail pages, AI panel, environment API config."),
        (420, 265, 170, 78, "API Management", "JWT validation, throttling, routing, policy enforcement, API products."),
        (620, 265, 150, 78, "Portal App", "Static/UI hosting and authenticated frontend runtime."),
        (420, 440, 170, 92, "Backend APIs", "Case draft, document metadata, extraction result, approvals, search, case details."),
        (620, 440, 150, 92, "Agent Orchestrator", "Run creation, tool routing, action cards, approval gating, status updates."),
        (420, 710, 170, 92, "ShipHat Pipelines", "Build, package, code scan, approvals, DEV/UAT/PROD deployment gates."),
        (620, 710, 150, 92, "App Config", "Environment settings, feature flags, endpoint references."),
        (890, 265, 230, 78, "Key Vault", "Secrets, certificates, keys, managed identity access."),
        (890, 440, 230, 92, "AI / Tool Services", "Azure OpenAI/model endpoint, OCR/extraction, validation and service lookups."),
        (890, 590, 230, 92, "Azure PostgreSQL", "Case, sequence, approval, audit, findings, agent run, tool run metadata."),
        (890, 710, 230, 92, "Storage + Monitor", "Uploaded documents, artifacts, logs, dashboards, alerts."),
        (1260, 265, 220, 78, "D365 On-Prem", "Approved case insert, response mapping, retry, write-back status."),
        (1260, 380, 220, 78, "Notification Service", "Submission, approval, decision, exception notifications."),
        (1260, 510, 220, 78, "Network Connectivity", "Approved private route or enterprise integration path to on-prem endpoints."),
        (1260, 710, 220, 78, "Code Scan Gates", "Static scan, dependency scan, secrets scan, license scan; no VAPT scope."),
    ]
    lines.extend(box(*b) for b in boxes)

    lines.append(
        f'<text x="45" y="930" font-family="{FONT}" font-size="12" fill="#475569">Production pattern assumes separate DEV, UAT, and PROD resource configuration with controlled promotion, explicit approval before D365 creation, and audit-first operational logging.</text>'
    )
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def main() -> None:
    outputs = {
        "syc_high_level_solution_architecture.svg": high_level_architecture(),
        "syc_detailed_solution_architecture.svg": detailed_architecture(),
    }
    for name, content in outputs.items():
        path = OUT_DIR / name
        path.write_text(content, encoding="utf-8")
        print(f"Wrote {path}")


if __name__ == "__main__":
    main()
