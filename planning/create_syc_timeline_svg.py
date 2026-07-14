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
    short: str


@dataclass(frozen=True)
class Milestone:
    name: str
    day: date
    row: int
    color: str
    anchor: str = "middle"


START = date(2026, 8, 1)
COMPLETION = date(2026, 11, 30)
TIMELINE_END = date(2027, 3, 1)

# A user-facing view: delivery work is intentionally grouped rather than shown as
# separate technical workstreams.  PGP starts only after production completion.
PHASES = [
    Phase("Planning", date(2026, 8, 1), date(2026, 8, 21), 0, "#315A9E", "Planning"),
    Phase("Set-up", date(2026, 8, 8), date(2026, 9, 7), 1, "#0F766E", "Set-up"),
    Phase("Development", date(2026, 8, 22), date(2026, 10, 25), 2, "#7C3AED", "Development"),
    Phase("User release", date(2026, 11, 1), date(2026, 11, 30), 3, "#DC2626", "Release"),
    Phase("Optional PGP (3 months)", date(2026, 12, 1), date(2027, 2, 28), 4, "#059669", "Optional PGP"),
]

MILESTONES = [
    Milestone("SYC POC start", START, 0, "#315A9E", "start"),
    Milestone("Planning complete", date(2026, 8, 21), 1, "#315A9E"),
    Milestone("Set-up complete", date(2026, 9, 7), 0, "#0F766E"),
    Milestone("Development complete", date(2026, 10, 25), 1, "#7C3AED"),
    Milestone("Production completion", COMPLETION, 0, "#DC2626"),
    Milestone("Optional PGP ends", date(2027, 2, 28), 1, "#059669", "end"),
]

MONTHS = [
    (date(2026, 8, 1), "Aug 2026"),
    (date(2026, 9, 1), "Sep 2026"),
    (date(2026, 10, 1), "Oct 2026"),
    (date(2026, 11, 1), "Nov 2026"),
    (date(2026, 12, 1), "Dec 2026"),
    (date(2027, 1, 1), "Jan 2027"),
    (date(2027, 2, 1), "Feb 2027"),
    (date(2027, 3, 1), ""),
]


def x_for(day: date) -> float:
    left = 220
    width = 960
    total = (TIMELINE_END - START).days
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
    height = 660
    top = 142
    lane_h = 54
    chart_bottom = top + lane_h * 5
    milestone_y = chart_bottom + 56
    lines: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#F8FAFC"/>',
        '<text x="48" y="50" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#0F172A">SYC User Delivery Timeline</text>',
        '<text x="48" y="77" font-family="Arial, sans-serif" font-size="14" fill="#475569">Production delivery completes in November 2026, followed by an optional 3-month PGP period.</text>',
        '<text x="48" y="105" font-family="Arial, sans-serif" font-size="12" fill="#64748B">Development combines the portal, agentic AI, integrations and DevOps workstreams.</text>',
        '<line x1="220" y1="124" x2="1180" y2="124" stroke="#CBD5E1" stroke-width="1"/>',
    ]

    for month, label in MONTHS:
        x = x_for(month)
        lines.append(f'<line x1="{x:.1f}" y1="124" x2="{x:.1f}" y2="{chart_bottom}" stroke="#E2E8F0" stroke-width="1"/>')
        if label:
            lines.append(f'<text x="{x + 7:.1f}" y="117" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#334155">{esc(label)}</text>')

    lane_labels = ["Planning", "Set-up", "Development", "User release", "Optional PGP"]
    for i, label in enumerate(lane_labels):
        y = top + i * lane_h
        fill = "#FFFFFF" if i % 2 == 0 else "#F1F5F9"
        lines.append(f'<rect x="48" y="{y - 25}" width="1132" height="{lane_h}" fill="{fill}" stroke="#E2E8F0"/>')
        lines.append(f'<text x="64" y="{y + 5}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#334155">{esc(label)}</text>')

    for phase in PHASES:
        x1 = x_for(phase.start)
        x2 = x_for(phase.end + timedelta(days=1))
        y = top + phase.lane * lane_h - 16
        bar_width = max(28, x2 - x1)
        lines.append(f'<rect x="{x1:.1f}" y="{y}" width="{bar_width:.1f}" height="31" rx="5" fill="{phase.color}"/>')
        lines.append(f'<text x="{x1 + 9:.1f}" y="{y + 20}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">{esc(phase.name)}</text>')

    for milestone in MILESTONES:
        x = x_for(milestone.day)
        y = milestone_y + milestone.row * 25
        label_x = x if milestone.anchor == "middle" else (x + 5 if milestone.anchor == "start" else x - 5)
        lines.extend([
            f'<line x1="{x:.1f}" y1="{chart_bottom}" x2="{x:.1f}" y2="{y - 13}" stroke="{milestone.color}" stroke-width="1.5"/>',
            f'<circle cx="{x:.1f}" cy="{chart_bottom}" r="4" fill="{milestone.color}"/>',
            f'<text x="{label_x:.1f}" y="{y}" text-anchor="{milestone.anchor}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="{milestone.color}">{esc(milestone.name)}</text>',
        ])

    completion_x = x_for(COMPLETION)
    lines.extend([
        f'<line x1="{completion_x:.1f}" y1="120" x2="{completion_x:.1f}" y2="{chart_bottom}" stroke="#DC2626" stroke-width="2" stroke-dasharray="6 5"/>',
        f'<text x="{completion_x - 7:.1f}" y="{chart_bottom - 12}" text-anchor="end" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#DC2626">Completion: 30 Nov 2026</text>',
        '<text x="48" y="638" font-family="Arial, sans-serif" font-size="12" fill="#475569">PGP is optional post-production support and stabilisation; it does not extend the production delivery completion date.</text>',
        '</svg>',
    ])
    return "\n".join(lines) + "\n"


def main() -> None:
    OUT.write_text(svg(), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
