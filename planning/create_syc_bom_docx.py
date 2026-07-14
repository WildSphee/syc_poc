"""Create the concise SYC production delivery bill of materials (DOCX)."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


OUT = Path(__file__).with_name("SYC_Production_BOM.docx")


def run(text: str, *, bold: bool = False, size: int = 18, color: str = "172554") -> str:
    props = f"<w:sz w:val=\"{size}\"/><w:szCs w:val=\"{size}\"/><w:color w:val=\"{color}\"/>"
    if bold:
        props = "<w:b/>" + props
    return f"<w:r><w:rPr>{props}</w:rPr><w:t xml:space=\"preserve\">{escape(text)}</w:t></w:r>"


def paragraph(text: str = "", *, bold: bool = False, size: int = 18, color: str = "172554", space_after: int = 80) -> str:
    return f"<w:p><w:pPr><w:spacing w:after=\"{space_after}\"/></w:pPr>{run(text, bold=bold, size=size, color=color)}</w:p>"


def cell(text: str, width: int, *, header: bool = False) -> str:
    fill = "1E3A8A" if header else "FFFFFF"
    color = "FFFFFF" if header else "172554"
    content = run(text, bold=header, size=16, color=color)
    return (
        f"<w:tc><w:tcPr><w:tcW w:w=\"{width}\" w:type=\"dxa\"/><w:shd w:fill=\"{fill}\"/>"
        "<w:tcMar><w:top w:w=\"65\" w:type=\"dxa\"/><w:left w:w=\"70\" w:type=\"dxa\"/>"
        "<w:bottom w:w=\"65\" w:type=\"dxa\"/><w:right w:w=\"70\" w:type=\"dxa\"/></w:tcMar></w:tcPr>"
        f"<w:p><w:pPr><w:spacing w:after=\"0\"/></w:pPr>{content}</w:p></w:tc>"
    )


def table(rows: list[tuple[str, str, str, str]]) -> str:
    widths = (1550, 2550, 700, 3220)
    parts = ["<w:tbl><w:tblPr><w:tblW w:w=\"8020\" w:type=\"dxa\"/><w:tblBorders>"
             "<w:top w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:left w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "<w:bottom w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:right w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "<w:insideH w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "</w:tblBorders></w:tblPr>"]
    for row_num, row in enumerate(rows):
        parts.append("<w:tr>" + "".join(cell(value, widths[i], header=row_num == 0) for i, value in enumerate(row)) + "</w:tr>")
    return "".join(parts) + "</w:tbl>"


def delivery_table(rows: list[tuple[str, str, str]]) -> str:
    widths = (2050, 1850, 4570)
    parts = ["<w:tbl><w:tblPr><w:tblW w:w=\"8470\" w:type=\"dxa\"/><w:tblBorders>"
             "<w:top w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:left w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "<w:bottom w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:right w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "<w:insideH w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "</w:tblBorders></w:tblPr>"]
    for row_num, row in enumerate(rows):
        parts.append("<w:tr>" + "".join(cell(value, widths[i], header=row_num == 0) for i, value in enumerate(row)) + "</w:tr>")
    return "".join(parts) + "</w:tbl>"


def document_xml() -> str:
    bom_rows = [
        ("Category", "Component", "Qty.", "Included baseline"),
        ("Environments", "Azure environments", "3", "DEV, UAT and PROD; separated configuration and access."),
        ("Cloud", "Network and private access", "3", "VNet/subnets, NSG/route baseline and private endpoints where applicable."),
        ("Cloud", "API Management and Key Vault", "3 each", "Gateway policies, secrets and managed-identity access."),
        ("Cloud", "PostgreSQL and Storage", "3 each", "Case/agent metadata, document storage, backups and retention baseline."),
        ("AI & identity", "Azure OpenAI endpoint and Entra ID", "3 / 1", "Model access, content-filtering baseline and portal authentication."),
        ("Application", "SYC portal and guided intake", "1", "Responsive filing journey, document upload, search and case view."),
        ("Application", "Agentic orchestration service", "1", "Extraction, validation, action cards and approval-controlled hand-off."),
        ("Integration", "API layer, D365 and notifications", "1 set", "Approved case write-back, retries, status reconciliation and alerts."),
        ("Delivery", "CI/CD, IaC, security scans", "1 set", "Build/release pipelines, environment promotion and scan gates."),
        ("Operations", "Monitoring, audit and runbooks", "1 set", "Dashboards, alerts, audit trail, backup/restore and handover guides."),
    ]
    delivery_rows = [
        ("Phase", "Completion", "User-visible outcome"),
        ("Planning", "21 Aug 2026", "Agreed delivery plan and implementation backlog."),
        ("Set-up", "7 Sep 2026", "Delivery environments and foundational access are ready."),
        ("Development", "25 Oct 2026", "Portal, agentic AI, integrations and DevOps delivered as one workstream."),
        ("Production completion", "30 Nov 2026", "Production deployment and user release completed."),
        ("Optional PGP", "1 Dec 2026–28 Feb 2027", "Three months of post-production support and stabilisation."),
    ]
    second_table = delivery_table(delivery_rows)
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
{paragraph("SYC Production Delivery", bold=True, size=32, color="172554", space_after=20)}
{paragraph("Bill of Materials (BOM)", bold=True, size=22, color="315A9E", space_after=140)}
{paragraph("Purpose", bold=True, size=19, color="172554", space_after=35)}
{paragraph("Concise baseline for the SYC production delivery. Quantities indicate logical delivery units; final Azure SKU, capacity and licence pricing remain subject to the approved design and subscription constraints.", size=17, color="334155", space_after=120)}
{table(bom_rows)}
{paragraph("Scope note: This BOM covers the production-delivery baseline. It excludes third-party licence fees, Azure consumption charges, penetration testing and changes outside the agreed SYC scope.", size=15, color="475569", space_after=0)}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
{paragraph("Delivery, completion and support", bold=True, size=26, color="172554", space_after=120)}
{second_table}
{paragraph("Included delivery outputs", bold=True, size=19, color="172554", space_after=40)}
{paragraph("• Production-ready portal and agentic AI workflow with user confirmation before case creation.\n• Secure integrations to approved services, including D365 write-back and notifications.\n• Deployment automation, operational monitoring, audit records and production handover runbooks.", size=17, color="334155", space_after=120)}
{paragraph("Optional PGP", bold=True, size=19, color="172554", space_after=40)}
{paragraph("The optional three-month post-go-live period begins after production completion. It covers stabilisation, incident and defect support, monitoring review and knowledge-transfer follow-up. New features or material scope changes require separate approval.", size=17, color="334155", space_after=120)}
{paragraph("Assumptions", bold=True, size=19, color="172554", space_after=40)}
{paragraph("Existing D365, identity, notification and network dependencies are available through approved interfaces; business owners provide timely decisions, access and production-release approval.", size=17, color="334155", space_after=0)}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="700" w:right="850" w:bottom="700" w:left="850" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr>
</w:body></w:document>'''


def write_docx() -> None:
    created = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    files = {
        "[Content_Types].xml": '''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>''',
        "_rels/.rels": '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>''',
        "word/_rels/document.xml.rels": '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>''',
        "word/styles.xml": '''<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:cs="Aptos"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>''',
        "docProps/core.xml": f'''<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>SYC Production Delivery BOM</dc:title><dc:creator>OpenAI Codex</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">{created}</dcterms:created></cp:coreProperties>''',
        "docProps/app.xml": '''<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Office Word</Application></Properties>''',
        "word/document.xml": document_xml(),
    }
    with ZipFile(OUT, "w", ZIP_DEFLATED) as archive:
        for path, content in files.items():
            archive.writestr(path, content.encode("utf-8"))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    write_docx()
