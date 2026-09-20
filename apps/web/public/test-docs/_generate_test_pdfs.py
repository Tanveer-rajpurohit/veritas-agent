"""Generate 4 new matter-evidence test PDFs for the Veritas /test-docs page.

Run: python3 generate_test_pdfs.py
Outputs into ./ (apps/web/public/test-docs/) in the staging tree.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib import colors
import os

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=16, alignment=TA_CENTER, spaceAfter=6)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, spaceBefore=8, spaceAfter=4)
BODY = ParagraphStyle("BODY", parent=styles["BodyText"], fontSize=10, leading=14, alignment=TA_JUSTIFY)
SMALL = ParagraphStyle("SMALL", parent=styles["BodyText"], fontSize=8.5, leading=11, textColor=colors.grey)
CENTER = ParagraphStyle("CENTER", parent=styles["BodyText"], fontSize=10, alignment=TA_CENTER)


def _hr():
    return HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#2c5478"), spaceBefore=4, spaceAfter=6)


def gst_tax_invoice(path):
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=16*mm)
    story = []
    story.append(Paragraph("TAX INVOICE", H1))
    story.append(Paragraph("GST COMPLIANT — Goods and Services Tax", CENTER))
    story.append(Spacer(1, 6))
    story.append(_hr())
    # Supplier / Recipient table
    info = [
        [Paragraph("<b>Supplier (Operational Creditor)</b>", BODY),
         Paragraph("<b>Recipient (Corporate Debtor)</b>", BODY)],
        [Paragraph("M/s Apex Logistics &amp; Freight Pvt Ltd<br/>GSTIN: 27ABCDE1234F1Z5<br/>CIN: U60230MH2019PTC332211<br/>Plot 14, MIDC Industrial Area, Andheri East, Mumbai 400093", BODY),
         Paragraph("Essel Infraprojects Ltd<br/>GSTIN: 27AAACE1234F1Z9<br/>CIN: L45200MH2006PLC153297<br/>4th Floor, Maker Chambers IV, Nariman Point, Mumbai 400021", BODY)],
    ]
    t = Table(info, colWidths=[85*mm, 85*mm])
    t.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#2c5478")),
        ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#9fc2df")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#edf4fa")),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 6))
    # Invoice meta
    meta = [
        ["Invoice No.", "APX-GST/2023-24/0042", "Invoice Date", "28 February 2023"],
        ["Place of Supply", "Maharashtra (27)", "Due Date", "31 March 2023"],
        ["GST Nature", "B2B — Forward Charge", "Currency", "INR"],
    ]
    mt = Table(meta, colWidths=[28*mm, 58*mm, 28*mm, 56*mm])
    mt.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#2c5478")),
        ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#9fc2df")),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f4f8fc")),
        ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#f4f8fc")),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"),
    ]))
    story.append(mt)
    story.append(Spacer(1, 8))
    # Line items
    story.append(Paragraph("Line Items", H2))
    items = [
        ["#", "Description of Service", "HSN", "Qty", "Rate (INR)", "Amount (INR)"],
        ["1", "Long-haul freight & logistics services — Q4 FY2022-23", "9965", "1", "18,50,000.00", "18,50,000.00"],
        ["2", "Warehousing & cold-storage handling charges", "9985", "1", "4,20,000.00", "4,20,000.00"],
        ["3", "Last-mile delivery & dispatch coordination", "9985", "1", "2,80,000.00", "2,80,000.00"],
    ]
    it = Table(items, colWidths=[10*mm, 70*mm, 16*mm, 14*mm, 30*mm, 30*mm])
    it.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#2c5478")),
        ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#9fc2df")),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2c5478")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("ALIGN", (2,0), (-1,-1), "RIGHT"),
        ("ALIGN", (0,0), (0,-1), "CENTER"),
    ]))
    story.append(it)
    story.append(Spacer(1, 6))
    # Totals
    totals = [
        ["Subtotal (Taxable Value)", "25,50,000.00"],
        ["IGST @ 18% (intra-state, recipient in different state)", "4,59,000.00"],
        ["Total Invoice Value (incl. GST)", "30,09,000.00"],
        ["Amount Paid", "0.00"],
        ["Balance Due", "30,09,000.00"],
    ]
    tt = Table(totals, colWidths=[110*mm, 42*mm])
    tt.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#2c5478")),
        ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#9fc2df")),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ALIGN", (1,0), (1,-1), "RIGHT"),
        ("BACKGROUND", (0,4), (-1,4), colors.HexColor("#fde8e8")),
        ("FONTNAME", (0,4), (-1,4), "Helvetica-Bold"),
    ]))
    story.append(tt)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Declaration: We declare that this invoice is computer-generated and authentic under "
        "Section 31 of the CGST Act, 2017 read with Rule 46 of the CGST Rules. The tax liability "
        "has been discharged through electronic credit ledger. Payment of the balance due is "
        "overdue since 31 March 2023.", BODY))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Authorised Signatory: ____________________  (For Apex Logistics &amp; Freight Pvt Ltd)", BODY))
    story.append(Spacer(1, 14))
    story.append(Paragraph(
        "TEST BENCHMARK: This invoice is intentionally WITHOUT a subsequent GST payment receipt and "
        "records an overdue balance of INR 30,09,000/- since 31.03.2023. Upload into a Matter to "
        "test Writer drafting of a Section 8 / Section 9 IBC demand notice and Fact Reviewer "
        "detection of an unpaid, GST-compliant operational debt.", SMALL))
    doc.build(story)


def bank_ledger_statement(path):
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=16*mm)
    story = []
    story.append(Paragraph("BANK ACCOUNT LEDGER STATEMENT", H1))
    story.append(Paragraph("Statement of Account — Term Loan Account", CENTER))
    story.append(Spacer(1, 4))
    story.append(_hr())
    head = [
        ["Account Holder", "Essel Infraprojects Ltd"],
        ["Account Number", "TL-2019-EL-0044-7711"],
        ["Loan Sanction Ref.", "JK-BANK/SANCTION/2019/0412 (dt. 12.04.2019)"],
        ["Branch", "Jammu &amp; Kashmir Bank, Corporate Branch, Mumbai"],
        ["Statement Period", "01 April 2022 — 31 March 2023"],
        ["Sanctioned Amount", "INR 24,50,00,000 (24.50 Crores)"],
        ["Rate of Interest", "11.25% p.a. (reset quarterly)"],
    ]
    ht = Table(head, colWidths=[42*mm, 110*mm])
    ht.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#2c5478")),
        ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#9fc2df")),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f4f8fc")),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(ht)
    story.append(Spacer(1, 8))
    story.append(Paragraph("Transaction Ledger", H2))
    rows = [
        ["Date", "Narration", "Debit (INR)", "Credit (INR)", "Balance (INR)"],
        ["12.04.2019", "Sanction disbursement — Term Loan", "", "2,45,00,000.00", "2,45,00,000.00"],
        ["15.01.2023", "EMI due — not serviced (DEFAULT)", "48,62,500.00", "", "2,93,62,500.00"],
        ["28.02.2023", "Interest capitalized — overdue EMI", "5,49,421.87", "", "2,99,11,921.87"],
        ["10.03.2023", "Reminder — written off as NPA", "", "", "2,99,11,921.87"],
        ["31.03.2023", "Quarterly interest capitalization", "8,37,841.50", "", "3,07,49,763.37"],
    ]
    lt = Table(rows, colWidths=[24*mm, 56*mm, 26*mm, 26*mm, 30*mm])
    lt.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#2c5478")),
        ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#9fc2df")),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2c5478")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("ALIGN", (2,0), (-1,-1), "RIGHT"),
        ("BACKGROUND", (0,2), (-1,2), colors.HexColor("#fde8e8")),
        ("FONTNAME", (0,2), (-1,2), "Helvetica-Bold"),
    ]))
    story.append(lt)
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>Outstanding as on 31.03.2023: INR 3,07,49,763.37 (Principal INR 2,93,62,500 + Interest INR 13,87,263.37)</b>",
        BODY))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Notes", H2))
    story.append(Paragraph(
        "1. The account was classified as a Non-Performing Asset (NPA) on 10.03.2023 after the EMI due on "
        "15.01.2023 remained unpaid for more than 90 days, in terms of the RBI Master Circular on IRAC norms.<br/>"
        "2. The default date recorded in the bank's internal system is 15.01.2023, which differs from the "
        "NeSL Information Utility Record of Default that shows 28.02.2023. This discrepancy is intentional "
        "and is the test trigger for the Fact Reviewer.", BODY))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Authorised by: ____________________  (Branch Manager, J&amp;K Bank)", BODY))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "TEST BENCHMARK: Ledger records default on 15.01.2023 (discrepant with NeSL IU 28.02.2023). "
        "Outstanding INR 3.07 Cr. Upload into the Essel Infra Matter to test Fact Reviewer discrepancy "
        "detection between the bank ledger and the NeSL record of default.", SMALL))
    doc.build(story)


def section_8_demand_notice(path):
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=18*mm)
    story = []
    story.append(Paragraph("DEMAND NOTICE UNDER SECTION 8", H1))
    story.append(Paragraph("Insolvency and Bankruptcy Code, 2016", CENTER))
    story.append(Spacer(1, 6))
    story.append(_hr())
    story.append(Paragraph("From:", H2))
    story.append(Paragraph(
        "M/s Apex Logistics &amp; Freight Pvt Ltd<br/>"
        "GSTIN: 27ABCDE1234F1Z5<br/>"
        "Plot 14, MIDC Industrial Area, Andheri East, Mumbai 400093<br/>"
        "(Operational Creditor)", BODY))
    story.append(Spacer(1, 4))
    story.append(Paragraph("To:", H2))
    story.append(Paragraph(
        "Essel Infraprojects Ltd<br/>"
        "CIN: L45200MH2006PLC153297<br/>"
        "4th Floor, Maker Chambers IV, Nariman Point, Mumbai 400021<br/>"
        "(Corporate Debtor)", BODY))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Date: 18 September 2023", BODY))
    story.append(Spacer(1, 6))
    story.append(Paragraph("SUBJECT: Demand for payment of unpaid operational debt of INR 30,09,000/- (Rupees Thirty Lakhs Nine Thousand only) under Section 8 of the Insolvency and Bankruptcy Code, 2016.", BODY))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Sir/Madam,", BODY))
    story.append(Paragraph(
        "Under and by virtue of Section 8 of the Insolvency and Bankruptcy Code, 2016, the Operational "
        "Creditor hereby demands payment of the operational debt particulars set out hereinbelow. "
        "The demand is raised consequent upon the Corporate Debtor's failure to pay the invoice "
        "<b>APX-GST/2023-24/0042 dated 28.02.2023</b> for long-haul freight, warehousing and last-mile "
        "delivery services rendered between October 2022 and February 2023.", BODY))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Particulars of Operational Debt", H2))
    debt = [
        ["Invoice No.", "APX-GST/2023-24/0042"],
        ["Invoice Date", "28 February 2023"],
        ["Taxable Value", "INR 25,50,000.00"],
        ["IGST @ 18%", "INR 4,59,000.00"],
        ["Total Invoice Value", "INR 30,09,000.00"],
        ["Date of Default", "31 March 2023 (end of billing month)"],
        ["Period of Default", "31.03.2023 to 18.09.2023 (171 days)"],
        ["Amount Now Due and Payable", "INR 30,09,000.00"],
    ]
    dt = Table(debt, colWidths=[70*mm, 82*mm])
    dt.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#2c5478")),
        ("INNERGRID", (0,0), (-1,-1), 0.3, colors.HexColor("#9fc2df")),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f4f8fc")),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("BACKGROUND", (0,7), (-1,7), colors.HexColor("#fde8e8")),
        ("FONTNAME", (0,7), (-1,7), "Helvetica-Bold"),
    ]))
    story.append(dt)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "In terms of Section 8 of the IBC, 2016, you are hereby called upon to repay the aforesaid "
        "operational debt of INR 30,09,000/- within a period of <b>ten (10) days</b> from the receipt "
        "of this notice, failing which the Operational Creditor shall initiate Corporate Insolvency "
        "Resolution Process against the Corporate Debtor by filing an application under Section 9 of "
        "the Code before the National Company Law Tribunal, Mumbai Bench.", BODY))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "The invoice and the unpaid ledger extract are enclosed herewith and form part of this demand. "
        "This notice is without prejudice to and without abandonment of any other right, remedy or "
        "claim available to the Operational Creditor in law.", BODY))
    story.append(Spacer(1, 14))
    story.append(Paragraph("For Apex Logistics &amp; Freight Pvt Ltd", BODY))
    story.append(Spacer(1, 20))
    story.append(Paragraph("____________________", BODY))
    story.append(Paragraph("Authorised Signatory", SMALL))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "TEST BENCHMARK: This is a complete Section 8 IBC demand notice tied to the GST invoice and bank "
        "ledger dossiers. Upload it into a Matter to test Writer agent's ability to draft a Section 9 "
        "IBC petition and Fact Reviewer's verification of the 10-day demand period and the debt amount.", SMALL))
    doc.build(story)


def legal_notice_section_80(path):
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=18*mm)
    story = []
    story.append(Paragraph("LEGAL NOTICE", H1))
    story.append(Paragraph("Under Section 80 of the Code of Civil Procedure, 1908", CENTER))
    story.append(Spacer(1, 6))
    story.append(_hr())
    story.append(Paragraph("From:", H2))
    story.append(Paragraph(
        "Mr. Rajan Mehta<br/>"
        "Proprietor, Mehta Trading Co.<br/>"
        "Shop 7, Crawford Market, Mumbai 400001<br/>"
        "(Notice-giver / prospective Plaintiff)", BODY))
    story.append(Paragraph("To:", H2))
    story.append(Paragraph(
        "Sterling Retail Ventures Pvt Ltd<br/>"
        "CIN: U52100MH2018PTC311558<br/>"
        "12, Mittal Tower, Worli, Mumbai 400018<br/>"
        "(Noticee / prospective Defendant)", BODY))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Date: 05 September 2023", BODY))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Under and in terms of Section 80 of the Code of Civil Procedure, 1908, I hereby give you "
        "Sixty (60) days' notice of my intention to institute a suit for the recovery of "
        "<b>INR 12,45,000/- (Rupees Twelve Lakhs Forty-Five Thousand only)</b>, together with interest "
        "at 18% per annum from 01 July 2023 until realisation, on the following grounds:", BODY))
    story.append(Spacer(1, 4))
    pts = [
        "1. Between 01 April 2023 and 30 June 2023, the Notice-giver supplied dry-groceries and "
        "packaged consumables to the Noticee pursuant to Purchase Orders PO-2023-0417, PO-2023-0512 "
        "and PO-2023-0631, aggregating INR 12,45,000/-.",
        "2. Goods were delivered and acknowledged under Goods Receipt Notes GRN-1188, GRN-1244 and "
        "GRN-1309; the Noticee has failed to make payment within the agreed 30-day credit period.",
        "3. By an email dated 15 July 2023, the Notice-giver called upon the Noticee to clear the "
        "outstanding dues; the Noticee acknowledged the debt but failed to pay.",
        "4. The non-payment constitutes breach of contract, entitling the Notice-giver to interest "
        "under Sections 73 and 74 of the Indian Contract Act, 1872.",
    ]
    for p in pts:
        story.append(Paragraph(p, BODY))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "In the premises, you are hereby called upon to pay the aforesaid sum of INR 12,45,000/- "
        "together with interest at 18% p.a. within Sixty (60) days from the receipt of this notice. "
        "Failing payment, I shall institute a suit in the Hon'ble Bombay City Civil Court for "
        "recovery of the said amount with interest and costs, without further reference.", BODY))
    story.append(Spacer(1, 14))
    story.append(Paragraph("For Mehta Trading Co.", BODY))
    story.append(Spacer(1, 20))
    story.append(Paragraph("____________________", BODY))
    story.append(Paragraph("Rajan Mehta, Proprietor", SMALL))
    story.append(Paragraph("Through: Adv. K. Deshmukh, Counsel", SMALL))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "TEST BENCHMARK: Section 80 CPC notice tied to a Contract Act / specific-relief recovery claim. "
        "Upload into a Matter to test Writer agent's ability to draft a Commercial Civil Suit and "
        "Fact Reviewer's verification of the 60-day statutory waiting period and the debt amount.", SMALL))
    doc.build(story)


if __name__ == "__main__":
    gst_tax_invoice(os.path.join(OUT_DIR, "gst-tax-invoice.pdf"))
    bank_ledger_statement(os.path.join(OUT_DIR, "bank-ledger-statement.pdf"))
    section_8_demand_notice(os.path.join(OUT_DIR, "section-8-demand-notice.pdf"))
    legal_notice_section_80(os.path.join(OUT_DIR, "legal-notice-section-80-cpc.pdf"))
    print("Generated 4 test PDFs in", OUT_DIR)
