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
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer


def load_payload(input_path: Path) -> dict:
    with input_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def decode_data_url(data_url: str | None) -> bytes | None:
    if not data_url or "," not in data_url:
        return None
    _header, encoded = data_url.split(",", 1)
    return base64.b64decode(encoded)


def register_contract_fonts() -> tuple[str, str]:
    regular_candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    bold_candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    regular_path = next((path for path in regular_candidates if path.exists()), None)
    bold_path = next((path for path in bold_candidates if path.exists()), None)
    if regular_path and bold_path:
        pdfmetrics.registerFont(TTFont("ContractRegular", str(regular_path)))
        pdfmetrics.registerFont(TTFont("ContractBold", str(bold_path)))
        return "ContractRegular", "ContractBold"
    return "Helvetica", "Helvetica-Bold"


def build_styles():
    styles = getSampleStyleSheet()
    regular_font, bold_font = register_contract_fonts()
    title = ParagraphStyle("ContractTitle", parent=styles["Heading1"], fontName=bold_font, fontSize=15, leading=19, alignment=TA_CENTER, spaceAfter=10, textColor=colors.black)
    heading = ParagraphStyle("ContractHeading", parent=styles["Heading2"], fontName=bold_font, fontSize=10.8, leading=14, spaceBefore=10, spaceAfter=5, textColor=colors.black)
    subheading = ParagraphStyle("ContractSubheading", parent=styles["Heading3"], fontName=bold_font, fontSize=9.8, leading=13, spaceBefore=6, spaceAfter=4, textColor=colors.black)
    body = ParagraphStyle("ContractBody", parent=styles["BodyText"], fontName=regular_font, fontSize=9.3, leading=13, spaceAfter=4, textColor=colors.black)
    bullet = ParagraphStyle("ContractBullet", parent=body, leftIndent=12, firstLineIndent=-8, bulletIndent=0)
    signature_heading = ParagraphStyle("SignatureHeading", parent=heading, spaceBefore=12, spaceAfter=8)
    return {"title": title, "heading": heading, "subheading": subheading, "body": body, "bullet": bullet, "signature_heading": signature_heading}


def classify_line(line: str) -> str:
    stripped = line.strip()
    if stripped.startswith(("CONTRAT D'ARTISTE", "ARTIST CONTRACT")):
        return "title"
    headings = {"PREAMBULE", "PRÉAMBULE", "SIGNATURE PAGE", "PAGE DE SIGNATURE", "ARTIST CONTRACT DETAILS", "COORDONNÉES CONTRACTUELLES DE L'ARTISTE"}
    if stripped.startswith("ARTICLE ") or stripped in headings:
        return "heading"
    if stripped[:1].isdigit() or stripped.endswith(":"):
        return "subheading"
    if stripped.startswith(("- ", "•")):
        return "bullet"
    return "body"


def build_story(payload: dict):
    styles = build_styles()
    story = []
    for raw_line in payload.get("contractText", "").splitlines():
        line = raw_line.strip()
        if not line:
            story.append(Spacer(1, 4))
            continue
        style_name = classify_line(line)
        paragraph_text = escape(line)
        if style_name == "bullet":
            clean_line = line.lstrip("- •").strip()
            story.append(Paragraph(escape(clean_line), styles["bullet"], bulletText="-"))
        else:
            story.append(Paragraph(paragraph_text, styles[style_name]))

    language = payload.get("contractLanguage", "en")
    is_french = language == "fr"
    story.append(Spacer(1, 10))
    story.append(Paragraph("Signature numérique de l'artiste" if is_french else "Artist digital signature", styles["signature_heading"]))
    signature_bytes = decode_data_url(payload.get("signatureDataUrl"))
    if signature_bytes:
        signature_image = Image(io.BytesIO(signature_bytes))
        signature_image.drawHeight = 22 * mm
        signature_image.drawWidth = 58 * mm
        story.append(signature_image)
        story.append(Spacer(1, 4))

    missing = "Non renseigné" if is_french else "Not provided"
    details = [
        (("Nom légal" if is_french else "Legal name"), payload.get("legalName", missing)),
        (("Nom d'artiste" if is_french else "Artist name"), payload.get("displayName") or missing),
        ("E-mail" if is_french else "Email", payload.get("email", missing)),
        (("Date et heure de signature" if is_french else "Signature date and time"), payload.get("signatureDateTimeLabel", missing)),
        (("Version du contrat" if is_french else "Agreement version"), payload.get("contractVersion", "N/A")),
    ]
    for label, value in details:
        story.append(Paragraph(f"{escape(label)}: {escape(value)}", styles["body"]))
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
        title=("Contrat artiste Make It Art" if payload.get("contractLanguage") == "fr" else "Make It Art Artist Agreement"),
        author="Make It Art",
    )
    document.build(build_story(payload))


if __name__ == "__main__":
    main()
