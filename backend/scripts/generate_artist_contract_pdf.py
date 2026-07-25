import base64
import io
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer


def load_payload(input_path: Path) -> dict:
    with input_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def decode_data_url(data_url: str | None) -> bytes | None:
    if not data_url or "," not in data_url:
        return None

    _header, encoded = data_url.split(",", 1)
    return base64.b64decode(encoded)


def build_styles():
    styles = getSampleStyleSheet()

    title = ParagraphStyle(
        "ContractTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        alignment=TA_CENTER,
        spaceAfter=10,
        textColor=colors.black,
    )
    heading = ParagraphStyle(
        "ContractHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.8,
        leading=14,
        spaceBefore=10,
        spaceAfter=5,
        textColor=colors.black,
    )
    subheading = ParagraphStyle(
        "ContractSubheading",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=9.8,
        leading=13,
        spaceBefore=6,
        spaceAfter=4,
        textColor=colors.black,
    )
    body = ParagraphStyle(
        "ContractBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.3,
        leading=13,
        spaceAfter=4,
        textColor=colors.black,
    )
    bullet = ParagraphStyle(
        "ContractBullet",
        parent=body,
        leftIndent=12,
        firstLineIndent=-8,
        bulletIndent=0,
    )
    signature_heading = ParagraphStyle(
        "SignatureHeading",
        parent=heading,
        spaceBefore=12,
        spaceAfter=8,
    )

    return {
        "title": title,
        "heading": heading,
        "subheading": subheading,
        "body": body,
        "bullet": bullet,
        "signature_heading": signature_heading,
    }


def classify_line(line: str) -> str:
    stripped = line.strip()

    if stripped == "CONTRAT D'ARTISTE POUR LA PLATEFORME DE COMMERCE D'ART NUMERIQUE":
        return "title"
    if stripped.startswith("ARTICLE ") or stripped in {"PREAMBULE", "PAGE DE SIGNATURE"}:
        return "heading"
    if stripped.startswith(tuple(str(i) for i in range(10))) or stripped.endswith(":"):
        return "subheading"
    if stripped.startswith("- "):
        return "bullet"
    return "body"


def build_story(payload: dict):
    styles = build_styles()
    story = []
    contract_text = payload.get("contractText", "")

    for raw_line in contract_text.splitlines():
        line = raw_line.strip()

        if not line:
          story.append(Spacer(1, 4))
          continue

        style_name = classify_line(line)
        paragraph_text = escape(line)

        if style_name == "title":
            story.append(Paragraph(paragraph_text, styles["title"]))
        elif style_name == "heading":
            story.append(Paragraph(paragraph_text, styles["heading"]))
        elif style_name == "subheading":
            story.append(Paragraph(paragraph_text, styles["subheading"]))
        elif style_name == "bullet":
            story.append(
                Paragraph(escape(line[2:].strip()), styles["bullet"], bulletText="-")
            )
        else:
            story.append(Paragraph(paragraph_text, styles["body"]))

    story.append(Spacer(1, 10))
    story.append(Paragraph("Signature numerique de l'artiste", styles["signature_heading"]))

    signature_bytes = decode_data_url(payload.get("signatureDataUrl"))
    if signature_bytes:
        signature_image = Image(io.BytesIO(signature_bytes))
        signature_image.drawHeight = 22 * mm
        signature_image.drawWidth = 58 * mm
        story.append(signature_image)
        story.append(Spacer(1, 4))

    story.append(
        Paragraph(
            f"Nom legal : {escape(payload.get('legalName', 'Non renseigne'))}",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            f"Nom d'artiste : {escape(payload.get('displayName') or 'Non renseigne')}",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            f"E-mail : {escape(payload.get('email', 'Non renseigne'))}",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            f"Date et heure de signature : {escape(payload.get('signatureDateTimeLabel', 'Non renseignee'))}",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            f"Version du contrat : {escape(payload.get('contractVersion', 'N/A'))}",
            styles["body"],
        )
    )

    return story


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: generate_artist_contract_pdf.py <input.json> <output.pdf>")

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
        title="Contrat artiste Make it Art",
        author="Make it Art",
    )
    document.build(build_story(payload))


if __name__ == "__main__":
    main()
