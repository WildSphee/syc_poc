from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path


OUT = Path(__file__).with_name("syc_delivery_timeline.svg")


@dataclass(frozen=True)
class Phase:
    name: str
    start: date
    end: date
    lane: int
    color: str
    note: str
    short: str


START = date(2026, 7, 1)
DEPLOYMENT = date(2026, 10, 31)
PGP_END = date(2027, 1, 31)

PHASES = [
    Phase("Initiation and Design", date(2026, 7, 1), date(2026, 7, 19), 0, "#315A9E", "scope, architecture, backlog", "Design"),
    Phase("Azure Foundation", date(2026, 7, 8), date(2026, 8, 7), 1, "#0F766E", "DEV/UAT/PROD, RBAC, Key Vault, APIM", "Azure"),
    Phase("Portal Upgrade", date(2026, 7, 22), date(2026, 9, 4), 2, "#B45309", "SYC JavaScript portal and intake UX", "Portal"),
    Phase("Agentic Orchestration", date(2026, 7, 29), date(2026, 9, 18), 3, "#7C3AED", "tool routing, approvals, metadata", "Agent"),
    Phase("Integration Build", date(2026, 8, 12), date(2026, 9, 25), 4, "#BE123C", "D365 on-prem and existing services", "Integration"),
    Phase("CI/CD and Code Scan", date(2026, 7, 15), date(2026, 9, 11), 5, "#2563EB", "ShipHat/Azure DevOps, scan gates", "CI/CD"),
    Phase("SIT and Hardening", date(2026, 9, 7), date(2026, 9, 30), 6, "#64748B", "end-to-end fixes and runbooks", "SIT"),
    Phase("UAT Round 1", date(2026, 10, 1), date(2026, 10, 12), 7, "#059669", "defects and retest", "UAT 1"),
    Phase("UAT Round 2", date(2026, 10, 13), date(2026, 10, 23), 7, "#16A34A", "regression and sign-off", "UAT 2"),
    Phase("Production Deployment", date(2026, 10, 24), date(2026, 10, 31), 8, "#DC2626", "cutover and smoke test", "Deploy"),
    Phase("PGP Month 1", date(2026, 11, 1), date(2026, 11, 30), 9, "#0891B2", "heightened monitoring", "PGP 1"),
    Phase("PGP Month 2", date(2026, 12, 1), date(2026, 12, 31), 9, "#0E7490", "trend review", "PGP 2"),
    Phase("PGP Month 3", date(2027, 1, 1), date(2027, 1, 31), 9, "#155E75", "closure readiness", "PGP 3"),
]

MONTHS = [
    (date(2026, 7, 1), "Jul 2026"),
    (date(2026, 8, 1), "Aug 2026"),
    (date(2026, 9, 1), "Sep 2026"),
    (date(2026, 10, 1), "Oct 2026"),
    (date(2026, 11, 1), "Nov 2026"),
    (date(2026, 12, 1), "Dec 2026"),
    (date(2027, 1, 1), "Jan 2027"),
    (date(2027, 2, 1), ""),
]


def x_for(day: date) -> float:
    left = 190
    width = 990
    total = (PGP_END - START).days + 1
    return left + ((day - START).days / total) * width


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def svg() -> str:
    width = 1240
    height = 720
    top = 116
    lane_h = 48
    lines: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#F8FAFC"/>',
        '<text x="48" y="50" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#0F172A">SYC Production Delivery Timeline</text>',
        '<text x="48" y="78" font-family="Arial, sans-serif" font-size="14" fill="#475569">4 months from project start to production deployment, followed by 3 months PGP</text>',
        '<line x1="190" y1="100" x2="1180" y2="100" stroke="#CBD5E1" stroke-width="1"/>',
    ]

    for month, label in MONTHS:
        x = x_for(month)
        lines.append(f'<line x1="{x:.1f}" y1="100" x2="{x:.1f}" y2="650" stroke="#E2E8F0" stroke-width="1"/>')
        if label:
            lines.append(f'<text x="{x + 8:.1f}" y="92" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#334155">{esc(label)}</text>')

    for i in range(10):
        y = top + i * lane_h
        fill = "#FFFFFF" if i % 2 == 0 else "#F1F5F9"
        lines.append(f'<rect x="48" y="{y - 24}" width="1132" height="{lane_h}" fill="{fill}" stroke="#E2E8F0"/>')

    lane_labels = [
        "Planning",
        "Azure Infra",
        "Frontend",
        "Agentic AI",
        "Integrations",
        "DevOps",
        "SIT",
        "UAT",
        "Go-Live",
        "PGP",
    ]
    for i, label in enumerate(lane_labels):
        y = top + i * lane_h + 5
        lines.append(f'<text x="64" y="{y}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#334155">{esc(label)}</text>')

    for phase in PHASES:
        x1 = x_for(phase.start)
        x2 = x_for(phase.end + timedelta(days=1))
        y = top + phase.lane * lane_h - 14
        w = max(24, x2 - x1)
        lines.append(f'<rect x="{x1:.1f}" y="{y}" width="{w:.1f}" height="28" rx="5" fill="{phase.color}"/>')
        label = phase.name if w >= 130 else phase.short
        text_x = x1 + 8 if w >= 58 else x1 + w + 5
        text_color = "#FFFFFF" if w >= 58 else phase.color
        lines.append(f'<text x="{text_x:.1f}" y="{y + 18}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="{text_color}">{esc(label)}</text>')

    dep_x = x_for(DEPLOYMENT)
    lines.extend(
        [
            f'<line x1="{dep_x:.1f}" y1="96" x2="{dep_x:.1f}" y2="650" stroke="#DC2626" stroke-width="2" stroke-dasharray="6 5"/>',
            f'<text x="{dep_x - 76:.1f}" y="676" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#DC2626">Production Deployment: 31 Oct 2026</text>',
        ]
    )
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def main() -> None:
    OUT.write_text(svg(), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
