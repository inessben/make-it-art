import json
import sys
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


NAVY = colors.HexColor("#090017")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#667085")
BORDER = colors.HexColor("#D8DEE9")
PANEL = colors.HexColor("#F6F8FC")
ACCENT = colors.HexColor("#4A6CF7")
SUCCESS = colors.HexColor("#157347")
WARNING = colors.HexColor("#9A6700")
DANGER = colors.HexColor("#B42318")


def load_payload(input_path: Path) -> dict:
    with input_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def clean(value, fallback="Non renseigne") -> str:
    text = " ".join(str(value or "").split())
    return text or fallback


def french_date(value) -> str:
    if not value:
        return "Non renseignee"
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo:
        try:
            parsed = parsed.astimezone(ZoneInfo("Europe/Paris"))
        except ZoneInfoNotFoundError:
            pass
    return parsed.strftime("%d/%m/%Y")


def money(amount, currency) -> str:
    safe_amount = int(amount or 0)
    value = f"{safe_amount / 100:,.2f}".replace(",", " ").replace(".", ",")
    return f"{value} {clean(currency, 'EUR')}"


def license_label(value) -> str:
    return {
        "PERSONAL": "Licence personnelle",
        "COMMERCIAL": "Licence commerciale",
        "EXCLUSIVE": "Licence exclusive",
    }.get(clean(value, ""), clean(value))


def status_details(value):
    return {
        "ACTIVE": ("ACTIF", SUCCESS, "Ce certificat est actuellement valide."),
        "SUSPENDED": (
            "SUSPENDU",
            WARNING,
            "Ce certificat est temporairement suspendu pendant l'examen d'un litige.",
        ),
        "REVOKED": (
            "REVOQUE",
            DANGER,
            "Ce certificat a ete revoque. Il reste disponible comme trace historique de l'achat.",
        ),
    }.get(clean(value, ""), ("ENREGISTRE", ACCENT, "Statut en cours de verification."))


def paragraph(value, style):
    return Paragraph(escape(clean(value)), style)


def details_table(rows, styles):
    cells = []
    for label, value in rows:
        cells.append(
            [
                Paragraph(escape(label.upper()), styles["label"]),
                paragraph(value, styles["value"]),
            ]
        )
    table = Table(cells, colWidths=[43 * mm, 119 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), PANEL),
                ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def section(title, rows, styles):
    return KeepTogether(
        [
            Paragraph(escape(title.upper()), styles["section"]),
            Spacer(1, 3 * mm),
            details_table(rows, styles),
            Spacer(1, 6 * mm),
        ]
    )


def build_story(payload):
    base = getSampleStyleSheet()
    styles = {
        "lead": ParagraphStyle(
            "CertificateLead",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=16,
            textColor=INK,
            spaceAfter=5 * mm,
        ),
        "section": ParagraphStyle(
            "CertificateSection",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=ACCENT,
            tracking=1.1,
        ),
        "label": ParagraphStyle(
            "CertificateLabel",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            textColor=MUTED,
        ),
        "value": ParagraphStyle(
            "CertificateValue",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=INK,
            splitLongWords=True,
        ),
        "status": ParagraphStyle(
            "CertificateStatus",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white,
            alignment=TA_CENTER,
        ),
        "status_note": ParagraphStyle(
            "CertificateStatusNote",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=MUTED,
            alignment=TA_LEFT,
        ),
        "fine_print": ParagraphStyle(
            "CertificateFinePrint",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=11,
            textColor=MUTED,
        ),
        "sandbox": ParagraphStyle(
            "CertificateSandbox",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=DANGER,
            alignment=TA_CENTER,
        ),
    }

    purchase = payload.get("purchase") or {}
    artwork = payload.get("artwork") or {}
    status_label, status_color, status_note = status_details(payload.get("status"))
    quantity = int(purchase.get("quantity") or 1)
    total_amount = int(purchase.get("unitAmount") or 0) * quantity

    status_badge = Table(
        [[Paragraph(status_label, styles["status"])]],
        colWidths=[34 * mm],
        hAlign="LEFT",
    )
    status_badge.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), status_color),
                ("BOX", (0, 0), (-1, -1), 0, status_color),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    status_row = Table(
        [[status_badge, Paragraph(escape(status_note), styles["status_note"])]],
        colWidths=[39 * mm, 123 * mm],
    )
    status_row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    story = [
        status_row,
        Spacer(1, 6 * mm),
        Paragraph(
            "Make It Art atteste que l'achat decrit ci-dessous a ete enregistre au benefice "
            "du collectionneur indique, selon les donnees conservees lors de la transaction.",
            styles["lead"],
        ),
        section(
            "Oeuvre acquise",
            [
                ("Titre", artwork.get("title")),
                ("Artiste", artwork.get("artistName")),
                ("Licence", license_label(artwork.get("licenseType"))),
                ("Quantite", str(quantity)),
            ],
            styles,
        ),
        section(
            "Acquisition",
            [
                ("Collectionneur", purchase.get("owner")),
                ("Commande", purchase.get("orderId")),
                ("Date d'achat", french_date(purchase.get("paidAt"))),
                ("Montant", money(total_amount, purchase.get("currency"))),
            ],
            styles,
        ),
        section(
            "Identification du certificat",
            [
                ("Numero", payload.get("number")),
                ("Date d'emission", french_date(payload.get("issuedAt"))),
                ("Statut", status_label.title()),
                ("Empreinte SHA-256", payload.get("fingerprint")),
            ],
            styles,
        ),
    ]

    if payload.get("sandbox"):
        story.extend(
            [
                Paragraph("DOCUMENT DE TEST - SANS VALEUR CONTRACTUELLE", styles["sandbox"]),
                Spacer(1, 4 * mm),
            ]
        )

    story.append(
        Paragraph(
            "Ce document constitue une preuve d'achat emise par Make It Art. Il ne remplace pas "
            "un certificat d'authenticite distinct eventuellement emis par l'artiste.",
            styles["fine_print"],
        )
    )
    return story


def draw_page(canvas, document, payload):
    page_width, page_height = A4
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, page_height - 41 * mm, page_width, 41 * mm, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.circle(20 * mm, page_height - 17 * mm, 4.2 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(29 * mm, page_height - 15.5 * mm, "MAKE IT ART")
    canvas.setFont("Helvetica-Bold", 22)
    canvas.drawString(18 * mm, page_height - 29 * mm, "CERTIFICAT D'ACHAT")

    number = clean(payload.get("number"), "")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#BFD0FF"))
    max_width = 75 * mm
    while stringWidth(number, "Helvetica", 8) > max_width and len(number) > 8:
        number = number[:-1]
    canvas.drawRightString(page_width - 18 * mm, page_height - 29 * mm, number)

    canvas.setStrokeColor(BORDER)
    canvas.line(18 * mm, 14 * mm, page_width - 18 * mm, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 9 * mm, "Document genere par Make It Art")
    canvas.drawRightString(page_width - 18 * mm, 9 * mm, f"Page {document.page}")
    canvas.restoreState()


def main():
    if len(sys.argv) != 3:
        raise SystemExit(
            "Usage: generate_ownership_certificate_pdf.py <input.json> <output.pdf>"
        )

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    payload = load_payload(input_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=24 * mm,
        rightMargin=24 * mm,
        topMargin=49 * mm,
        bottomMargin=20 * mm,
        title=f"Certificat d'achat {clean(payload.get('number'), '')}",
        author="Make It Art",
        subject="Certificat d'achat collectionneur",
    )
    document.build(
        build_story(payload),
        onFirstPage=lambda canvas, doc: draw_page(canvas, doc, payload),
        onLaterPages=lambda canvas, doc: draw_page(canvas, doc, payload),
    )


if __name__ == "__main__":
    main()
