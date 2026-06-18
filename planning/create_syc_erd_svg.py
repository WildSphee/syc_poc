from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


OUT = Path(__file__).with_name("syc_production_erd.svg")
FONT = "Arial, sans-serif"


@dataclass(frozen=True)
class Entity:
    name: str
    x: int
    y: int
    w: int
    fields: tuple[str, ...]
    fill: str = "#FFFFFF"


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def entity_height(entity: Entity) -> int:
    return 42 + len(entity.fields) * 21 + 14


def entity_box(entity: Entity) -> str:
    h = entity_height(entity)
    lines = [
        f'<rect x="{entity.x}" y="{entity.y}" width="{entity.w}" height="{h}" rx="8" fill="{entity.fill}" stroke="#94A3B8" stroke-width="1.2"/>',
        f'<rect x="{entity.x}" y="{entity.y}" width="{entity.w}" height="38" rx="8" fill="#1E3A8A"/>',
        f'<path d="M {entity.x} {entity.y + 30} H {entity.x + entity.w} V {entity.y + 38} H {entity.x} Z" fill="#1E3A8A"/>',
        f'<text x="{entity.x + 14}" y="{entity.y + 25}" font-family="{FONT}" font-size="14" font-weight="700" fill="#FFFFFF">{esc(entity.name)}</text>',
    ]
    for i, field in enumerate(entity.fields):
        y = entity.y + 62 + i * 21
        color = "#0F172A" if field.startswith("PK") else "#334155"
        weight = "700" if field.startswith("PK") else "400"
        lines.append(
            f'<text x="{entity.x + 14}" y="{y}" font-family="{FONT}" font-size="12" font-weight="{weight}" fill="{color}">{esc(field)}</text>'
        )
    return "\n".join(lines)


def elbow(points: list[tuple[int, int]], label: str = "", color: str = "#475569") -> str:
    path = " ".join(
        f"{'M' if i == 0 else 'L'} {x} {y}" for i, (x, y) in enumerate(points)
    )
    lines = [
        f'<path d="{path}" fill="none" stroke="{color}" stroke-width="1.5" marker-end="url(#arrow)"/>'
    ]
    if label:
        x, y = points[len(points) // 2]
        lines.append(
            f'<rect x="{x + 5}" y="{y - 19}" width="{max(82, len(label) * 6 + 12)}" height="18" rx="4" fill="#F8FAFC" opacity="0.92"/>'
        )
        lines.append(
            f'<text x="{x + 11}" y="{y - 6}" font-family="{FONT}" font-size="10" fill="{color}">{esc(label)}</text>'
        )
    return "\n".join(lines)


def svg() -> str:
    width, height = 1540, 1120
    entities = [
        Entity(
            "app_users",
            60,
            145,
            250,
            (
                "PK user_id uuid",
                "entra_object_id varchar",
                "display_name varchar",
                "email varchar",
                "role_code varchar",
                "is_active boolean",
                "created_at timestamptz",
            ),
            "#F8FAFC",
        ),
        Entity(
            "cases",
            430,
            135,
            270,
            (
                "PK case_id uuid",
                "case_reference varchar",
                "applicant_user_id uuid FK",
                "case_status varchar",
                "submission_channel varchar",
                "d365_case_ref varchar",
                "created_at timestamptz",
                "updated_at timestamptz",
            ),
            "#EFF6FF",
        ),
        Entity(
            "case_parties",
            800,
            135,
            260,
            (
                "PK party_id uuid",
                "case_id uuid FK",
                "party_type varchar",
                "full_name varchar",
                "identifier_hash varchar",
                "contact_json jsonb",
                "created_at timestamptz",
            ),
            "#FFFFFF",
        ),
        Entity(
            "case_documents",
            1170,
            135,
            280,
            (
                "PK document_id uuid",
                "case_id uuid FK",
                "storage_uri varchar",
                "document_type varchar",
                "file_hash varchar",
                "processing_status varchar",
                "uploaded_by uuid FK",
                "uploaded_at timestamptz",
            ),
            "#FFFFFF",
        ),
        Entity(
            "approval_requests",
            60,
            445,
            290,
            (
                "PK approval_request_id uuid",
                "case_id uuid FK",
                "requested_by uuid FK",
                "approver_group varchar",
                "request_status varchar",
                "request_comment text",
                "created_at timestamptz",
            ),
            "#FFF7ED",
        ),
        Entity(
            "approval_decisions",
            430,
            445,
            290,
            (
                "PK approval_decision_id uuid",
                "approval_request_id uuid FK",
                "decision_by uuid FK",
                "decision varchar",
                "decision_comment text",
                "decided_at timestamptz",
            ),
            "#FFF7ED",
        ),
        Entity(
            "agent_runs",
            800,
            445,
            280,
            (
                "PK agent_run_id uuid",
                "case_id uuid FK",
                "session_hash varchar",
                "run_status varchar",
                "model_name varchar",
                "started_at timestamptz",
                "completed_at timestamptz",
            ),
            "#F5F3FF",
        ),
        Entity(
            "tool_runs",
            1170,
            445,
            290,
            (
                "PK tool_run_id uuid",
                "agent_run_id uuid FK",
                "document_id uuid FK nullable",
                "tool_name varchar",
                "input_hash varchar",
                "output_hash varchar",
                "tool_status varchar",
                "started_at timestamptz",
            ),
            "#F5F3FF",
        ),
        Entity(
            "findings",
            60,
            755,
            290,
            (
                "PK finding_id uuid",
                "case_id uuid FK",
                "agent_run_id uuid FK",
                "document_id uuid FK nullable",
                "field_name varchar",
                "field_value_json jsonb",
                "confidence numeric",
                "finding_status varchar",
            ),
            "#ECFEFF",
        ),
        Entity(
            "sequence_records",
            430,
            755,
            290,
            (
                "PK sequence_record_id uuid",
                "case_id uuid FK",
                "agent_run_id uuid FK nullable",
                "sequence_no integer",
                "event_type varchar",
                "payload_hash varchar",
                "created_at timestamptz",
            ),
            "#ECFEFF",
        ),
        Entity(
            "d365_writebacks",
            800,
            755,
            290,
            (
                "PK writeback_id uuid",
                "case_id uuid FK",
                "approval_decision_id uuid FK",
                "d365_case_id varchar",
                "writeback_status varchar",
                "retry_count integer",
                "last_error text",
                "created_at timestamptz",
            ),
            "#FFE4E6",
        ),
        Entity(
            "audit_events",
            1170,
            755,
            290,
            (
                "PK audit_event_id uuid",
                "case_id uuid FK nullable",
                "actor_user_id uuid FK nullable",
                "event_type varchar",
                "entity_name varchar",
                "entity_id uuid",
                "correlation_id varchar",
                "created_at timestamptz",
            ),
            "#F8FAFC",
        ),
    ]

    relationships = [
        ([(310, 218), (430, 218)], "1 applicant -> many cases"),
        ([(700, 218), (800, 218)], "1 case -> parties"),
        ([(700, 252), (1170, 252)], "1 case -> documents"),
        ([(565, 323), (565, 405), (205, 405), (205, 445)], "1 case -> approvals"),
        ([(350, 525), (430, 525)], "request -> decisions"),
        ([(700, 286), (760, 286), (760, 525), (800, 525)], "1 case -> agent runs"),
        ([(1080, 525), (1170, 525)], "1 agent run -> tools"),
        ([(1310, 365), (1310, 445)], "document -> tool run"),
        ([(565, 323), (565, 715), (205, 715), (205, 755)], "1 case -> findings"),
        ([(940, 615), (940, 715), (205, 715), (205, 755)], "run -> findings"),
        ([(1310, 365), (1310, 715), (205, 715), (205, 755)], "document -> findings"),
        ([(565, 323), (565, 755)], "1 case -> sequence"),
        ([(940, 615), (940, 715), (575, 715), (575, 755)], "run -> sequence"),
        ([(575, 665), (575, 715), (945, 715), (945, 755)], "approval -> D365"),
        ([(565, 323), (565, 700), (945, 700), (945, 755)], "approved case -> D365"),
        ([(310, 248), (370, 248), (370, 1010), (1170, 1010), (1170, 855)], "actor -> audit"),
        ([(700, 300), (740, 300), (740, 1010), (1170, 1010), (1170, 835)], "case -> audit"),
    ]

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#475569"/></marker></defs>',
        '<rect width="100%" height="100%" fill="#F8FAFC"/>',
        f'<text x="50" y="50" font-family="{FONT}" font-size="26" font-weight="700" fill="#0F172A">SYC Production Data Model ERD</text>',
        f'<text x="50" y="78" font-family="{FONT}" font-size="13" fill="#475569">Azure PostgreSQL conceptual schema for cases, approvals, agent metadata, document processing, D365 write-back, and audit events</text>',
        '<rect x="50" y="100" width="1440" height="960" rx="14" fill="#FFFFFF" stroke="#E2E8F0"/>',
    ]

    # Draw relationship paths first so entity boxes remain visually dominant.
    lines.extend(elbow(points, label) for points, label in relationships)
    lines.extend(entity_box(entity) for entity in entities)

    lines.extend(
        [
            '<rect x="60" y="1080" width="12" height="12" rx="2" fill="#1E3A8A"/>',
            f'<text x="82" y="1091" font-family="{FONT}" font-size="12" fill="#475569">PK = primary key, FK = foreign key. Hash fields avoid storing raw assistant conversation or sensitive source values in metadata tables.</text>',
            "</svg>",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    OUT.write_text(svg(), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
