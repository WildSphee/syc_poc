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


def table(rows: list[tuple[str, str, str, str, str]]) -> str:
    widths = (1180, 1850, 500, 2120, 3180)
    parts = ["<w:tbl><w:tblPr><w:tblW w:w=\"8830\" w:type=\"dxa\"/><w:tblBorders>"
             "<w:top w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:left w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "<w:bottom w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:right w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "<w:insideH w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:color=\"CBD5E1\"/>"
             "</w:tblBorders></w:tblPr>"]
    for row_num, row in enumerate(rows):
        parts.append("<w:tr>" + "".join(cell(value, widths[i], header=row_num == 0) for i, value in enumerate(row)) + "</w:tr>")
    return "".join(parts) + "</w:tbl>"


def document_xml() -> str:
    bom_rows = [
        ("Category", "Component", "Qty.", "Commercial estimate (USD/month)", "Cost basis / status"),
        ("Environments", "Azure environments", "3", "$0", "Existing DEV, UAT and PROD environments."),
        ("Cloud", "Network and private access", "3", "$0", "Existing VNet/subnets, private access and security baseline."),
        ("Cloud", "API Management and Key Vault", "3 each", "$0", "Existing gateway, secrets and managed-identity services."),
        ("Cloud", "PostgreSQL Flexible Server", "3", "$0", "Existing case and agent metadata database service."),
        ("Compute", "Application virtual machine (16 GiB RAM)", "2", "$350.40", "AWS EC2 m6i.xlarge: 4 vCPU, 16 GiB; Singapore on-demand, 730 hours/month at $0.24/hour. Standalone VM; no Kubernetes or AKS. Storage not estimated."),
        ("AI", "AWS Bedrock – Amazon Nova Lite", "1", "$0.36", "2M input + 1M output tokens/month; on-demand commercial estimate."),
        ("Identity", "Entra ID", "1", "$0", "Existing portal authentication and access-control service."),
        ("Application", "SYC portal and guided intake", "1", "$0", "Existing application resource; delivery work only."),
        ("Application", "Agentic orchestration service", "1", "$0", "Existing application resource; delivery work only."),
        ("Integration", "API layer, D365 and notifications", "1 set", "$0", "Existing approved enterprise interfaces and services."),
        ("Operations", "CI/CD, IaC, monitoring and audit", "1 set", "$0", "Existing delivery and operational tooling."),
    ]
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
{paragraph("SYC Production Delivery", bold=True, size=32, color="172554", space_after=20)}
{paragraph("Bill of Materials (BOM)", bold=True, size=22, color="315A9E", space_after=140)}
{paragraph("Commercial pricing estimate", bold=True, size=19, color="172554", space_after=35)}
{paragraph("Only two 16 GiB virtual machines and AWS Bedrock are priced. All other BOM entries use resources already provisioned, so their incremental estimate is $0. VM storage is not estimated. Prices are in USD and exclude applicable taxes.", size=17, color="334155", space_after=120)}
{table(bom_rows)}
{paragraph("Monthly priced total: $350.76 USD", bold=True, size=19, color="172554", space_after=55)}
{paragraph("Pricing reference: AWS EC2 m6i.xlarge (4 vCPU, 16 GiB) in Asia Pacific (Singapore) is priced at $0.24/hour on demand; 730 hours/month gives $175.20 per VM. AWS Bedrock Amazon Nova Lite is modelled at $0.00006 per 1,000 input tokens and $0.00024 per 1,000 output tokens. VM storage; Bedrock embeddings, guardrails, knowledge bases and provisioned throughput are not included in this estimate. Public pricing checked 14 Jul 2026.", size=15, color="475569", space_after=0)}
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
