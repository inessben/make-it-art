import json
import sys
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def load_payload(input_path: Path) -> dict:
    with input_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def money(amount: int, currency: str) -> str:
    return f"{amount / 100:,.2f} {currency}".replace(",", " ").replace(".", ",")


def address_lines(entity: dict) -> list[str]:
    address = entity.get("address") or {}
    return [
        entity.get("legalName") or entity.get("name") or "",
        entity.get("displayName") or "",
        address.get("line1") or "",
        address.get("line2") or "",
        " ".join(filter(None, [address.get("postalCode"), address.get("city")])),
        address.get("country") or "",
        entity.get("registrationId") or "",
        entity.get("vatId") or entity.get("taxId") or "",
        entity.get("email") or "",
    ]


def entity_block(title: str, entity: dict, styles: dict):
    lines = [escape(str(value)) for value in address_lines(entity) if value]
    return [
        Paragraph(title, styles["small_heading"]),
        Paragraph("<br/>".join(lines), styles["body"]),
    ]


def build_story(payload: dict):
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "SmallHeading",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#4A6CF7"),
        )
    )
    styles.add(
        ParagraphStyle(
            "InvoiceBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
        )
    )
    styles.add(
        ParagraphStyle(
            "Money",
            parent=styles["InvoiceBody"],
            alignment=TA_RIGHT,
        )
    )
    named = {
        "small_heading": styles["SmallHeading"],
        "body": styles["InvoiceBody"],
        "money": styles["Money"],
    }
    currency = payload.get("currency", "EUR")
    invoice_label = "FACTURE DE VENTE" if payload.get("type") == "SALE" else "FACTURE DE COMMISSION"
    issued_at = datetime.fromisoformat(str(payload["issuedAt"]).replace("Z", "+00:00"))
    story = [
        Paragraph(invoice_label, styles["Title"]),
        Paragraph(f"N° {escape(payload['number'])}", styles["Heading2"]),
        Paragraph(f"Date d'émission : {issued_at.strftime('%d/%m/%Y')}", named["body"]),
        Spacer(1, 8),
    ]

    parties = Table(
        [
            [
                entity_block("ÉMETTEUR", payload.get("issuer") or {}, named),
                entity_block("DESTINATAIRE", payload.get("recipient") or {}, named),
            ]
        ],
        colWidths=[82 * mm, 82 * mm],
    )
    parties.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#C7CFDD")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C7CFDD")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F5F7FB")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend([parties, Spacer(1, 12)])

    rows = [["Description", "Qté", "Montant HT", "TVA", "Total TTC"]]
    for line in payload.get("lines") or []:
        rows.append(
            [
                Paragraph(escape(str(line.get("description") or "")), named["body"]),
                str(line.get("quantity") or 1),
                money(int(line.get("netAmount") or 0), currency),
                money(int(line.get("taxAmount") or 0), currency),
                money(int(line.get("totalAmount") or 0), currency),
            ]
        )

    lines_table = Table(rows, colWidths=[78 * mm, 14 * mm, 25 * mm, 22 * mm, 27 * mm])
    lines_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#172033")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#C7CFDD")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFD")]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([lines_table, Spacer(1, 10)])

    totals = [
        ["Sous-total", money(int(payload.get("subtotalAmount") or 0), currency)],
        ["Réductions", money(int(payload.get("discountAmount") or 0), currency)],
        ["Total HT", money(int(payload.get("netAmount") or 0), currency)],
        ["TVA", money(int(payload.get("taxAmount") or 0), currency)],
        ["Total TTC", money(int(payload.get("totalAmount") or 0), currency)],
    ]
    totals_table = Table(totals, colWidths=[35 * mm, 32 * mm], hAlign="RIGHT")
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#172033")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.extend([totals_table, Spacer(1, 14)])

    if (payload.get("issuer") or {}).get("sandbox"):
        story.append(
            Paragraph(
                "DOCUMENT DE TEST — SANS VALEUR COMPTABLE",
                ParagraphStyle(
                    "Sandbox",
                    parent=styles["Heading2"],
                    textColor=colors.HexColor("#B42318"),
                ),
            )
        )

    story.append(
        Paragraph(
            f"Empreinte SHA-256 : {escape(payload.get('fingerprint', ''))}",
            named["body"],
        )
    )
    return story


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: generate_invoice_pdf.py <input.json> <output.pdf>")

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    payload = load_payload(input_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Facture {payload.get('number', '')}",
        author="Make It Art",
    )
    document.build(build_story(payload))


if __name__ == "__main__":
    main()
