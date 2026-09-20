import os
import pymupdf

OUTPUT_DIR = os.path.abspath("apps/web/public/test-docs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def draw_header_footer(page, title, doc_num=""):
    rect = page.rect
    # Header line
    page.draw_line(pymupdf.Point(50, 45), pymupdf.Point(rect.width - 50, 45), color=(0.28, 0.48, 0.66), width=1)
    page.insert_text(pymupdf.Point(50, 38), title.upper(), fontsize=8, fontname="helv", color=(0.4, 0.45, 0.5))
    if doc_num:
        page.insert_text(pymupdf.Point(rect.width - 150, 38), doc_num, fontsize=8, fontname="helv", color=(0.4, 0.45, 0.5))
    
    # Footer line
    page.draw_line(pymupdf.Point(50, rect.height - 45), pymupdf.Point(rect.width - 50, rect.height - 45), color=(0.8, 0.82, 0.85), width=0.5)
    page.insert_text(pymupdf.Point(50, rect.height - 32), "VERITAS TEST REPOSITORY | STATUTORY & EVIDENCE FIXTURE", fontsize=7.5, fontname="helv", color=(0.55, 0.58, 0.62))
    page.insert_text(pymupdf.Point(rect.width - 85, rect.height - 32), f"Page {page.number + 1}", fontsize=7.5, fontname="helv", color=(0.55, 0.58, 0.62))

def create_pooja_ramesh_singh_pdf():
    doc = pymupdf.open()
    
    # Page 1
    page = doc.new_page(width=595, height=842)
    draw_header_footer(page, "Supreme Court of India — Judgment Extract", "2026 INSC 668")
    
    y = 80
    page.insert_text(pymupdf.Point(160, y), "IN THE SUPREME COURT OF INDIA", fontsize=13, fontname="tibo", color=(0.1, 0.2, 0.35))
    y += 18
    page.insert_text(pymupdf.Point(180, y), "CIVIL APPELLATE JURISDICTION", fontsize=10, fontname="tibo", color=(0.2, 0.25, 0.3))
    y += 22
    page.insert_text(pymupdf.Point(170, y), "CIVIL APPEAL NO. 7481 OF 2026", fontsize=11, fontname="tibo", color=(0.15, 0.15, 0.2))
    y += 16
    page.insert_text(pymupdf.Point(155, y), "(Arising out of SLP (C) No. 19284 of 2025)", fontsize=9, fontname="tiit", color=(0.4, 0.4, 0.45))
    
    y += 35
    page.insert_text(pymupdf.Point(60, y), "POOJA RAMESH SINGH", fontsize=11, fontname="tibo")
    page.insert_text(pymupdf.Point(440, y), "... APPELLANT", fontsize=10, fontname="tibo")
    y += 18
    page.insert_text(pymupdf.Point(270, y), "VERSUS", fontsize=10, fontname="tibo")
    y += 20
    page.insert_text(pymupdf.Point(60, y), "JAMMU AND KASHMIR BANK LTD. & ANR.", fontsize=11, fontname="tibo")
    page.insert_text(pymupdf.Point(420, y), "... RESPONDENTS", fontsize=10, fontname="tibo")
    
    y += 30
    page.draw_line(pymupdf.Point(60, y), pymupdf.Point(535, y), color=(0.7, 0.75, 0.8), width=0.8)
    y += 20
    
    bench_text = "CORAM: HON'BLE MR. JUSTICE PAMIDIGHANTAM SRI NARASIMHA\nHON'BLE MR. JUSTICE ALOK ARADHE\nDATE OF JUDGMENT: JULY 2, 2026 | CITATION: 2026 INSC 668"
    rect_box = pymupdf.Rect(60, y, 535, y + 55)
    page.draw_rect(rect_box, color=(0.85, 0.9, 0.95), fill=(0.95, 0.97, 1.0))
    page.insert_textbox(pymupdf.Rect(70, y + 8, 525, y + 50), bench_text, fontsize=9, fontname="hebo", color=(0.15, 0.3, 0.45))
    
    y += 75
    page.insert_text(pymupdf.Point(60, y), "JUDGMENT & DIRECTIVES ON AI HALLUCINATIONS", fontsize=11, fontname="hebo", color=(0.8, 0.2, 0.15))
    y += 18
    
    p1 = (
        "1. This appeal arises from an order dated 14.11.2025 passed by the National Company Law "
        "Appellate Tribunal (NCLAT), Principal Bench, New Delhi, upholding the admission of an application under "
        "Section 7 of the Insolvency and Bankruptcy Code, 2016 (IBC) filed by Respondent No. 1, Jammu & Kashmir Bank Ltd."
    )
    page.insert_textbox(pymupdf.Rect(60, y, 535, y + 55), p1, fontsize=9.5, fontname="tiro")
    y += 50
    
    p2 = (
        "2. Upon a forensic examination of the impugned orders, this Court was confronted with a startling reality: "
        "both the Adjudicating Authority (NCLT) and the Appellate Tribunal relied extensively upon six purported judicial authorities "
        "cited by counsel during oral submissions and written notes. A rigorous verification against Supreme Court Cases (SCC), "
        "All India Reporter (AIR), and the Official Gazette reveals that four of these judgments are non-existent, and the "
        "remaining two contain AI-hallucinated paragraphs never penned by any bench of this Court."
    )
    page.insert_textbox(pymupdf.Rect(60, y, 535, y + 75), p2, fontsize=9.5, fontname="tiro")
    y += 75
    
    p3 = (
        "3. Fabricating judicial precedent through unverified Generative Artificial Intelligence tools and placing such fictitious citations "
        "before judicial tribunals is a contamination of the stream of justice. As observed during proceedings, relying on AI-hallucinated "
        "precedents is akin to releasing toxic gas into the province of law. An order resting upon a fabricated citation is no decision "
        "in the eye of the law, being null, void, and inherently unsustainable."
    )
    page.insert_textbox(pymupdf.Rect(60, y, 535, y + 80), p3, fontsize=9.5, fontname="tiro")
    y += 80
    
    p4 = (
        "4. ZERO-TOLERANCE MANDATE: We set aside the impugned orders of the NCLT and NCLAT and remand the matter for fresh "
        "adjudication on the merits. We lay down an inviolable directive for all Adjudicating Authorities under the IBC: "
        "Every citation, ledger claim, and date of default submitted in Section 7 pleadings must be backed by authenticated provenance "
        "and primary records. Human-in-the-loop verification is mandatory before any order admitting CIRP is pronounced."
    )
    page.insert_textbox(pymupdf.Rect(60, y, 535, y + 90), p4, fontsize=9.5, fontname="tibo", color=(0.15, 0.15, 0.2))
    
    # Page 2: Directions and Bar Council Notification
    page2 = doc.new_page(width=595, height=842)
    draw_header_footer(page2, "Supreme Court of India — Judgment Extract", "2026 INSC 668")
    
    y = 75
    page2.insert_text(pymupdf.Point(60, y), "DIRECTIONS TO REGULATORY & TRIBUNAL AUTHORITIES", fontsize=11, fontname="hebo", color=(0.15, 0.3, 0.45))
    y += 20
    
    table_rect = pymupdf.Rect(60, y, 535, y + 140)
    page2.draw_rect(table_rect, color=(0.7, 0.75, 0.8), fill=(0.98, 0.98, 0.99))
    
    directives = (
        "DIRECTIVE 1: NCLT & NCLAT Registry Verification\n"
        "The Registrar of all NCLT benches shall require a mandatory Citation Compliance Certificate "
        "stating that all citations in applications under Section 7, 9, and 10 of the IBC have been cross-verified "
        "against official repositories.\n\n"
        "DIRECTIVE 2: Bar Council of India Guidelines\n"
        "The Bar Council of India is directed to frame uniform regulatory norms governing the ethical deployment of "
        "legal AI systems, ensuring strict accountability for non-existent case submissions.\n\n"
        "DIRECTIVE 3: Information Utility Default Verification\n"
        "Financial creditors must submit NeSL authenticated records of default in Form D. In case of variance between "
        "ledger statements and the IU certificate, the Adjudicating Authority must issue a notice before proceeding."
    )
    page2.insert_textbox(pymupdf.Rect(70, y + 10, 525, y + 130), directives, fontsize=8.8, fontname="helv")
    y += 160
    
    page2.insert_text(pymupdf.Point(60, y), "CASE SUMMARY FOR VERITAS EVIDENCE BENCHMARKING", fontsize=10.5, fontname="hebo", color=(0.28, 0.48, 0.66))
    y += 18
    
    summary_text = (
        "• Appellant: Pooja Ramesh Singh (Suspended Director, Essel Infraprojects Ltd.)\n"
        "• Respondent: Jammu & Kashmir Bank Ltd.\n"
        "• Primary Loan: Term Loan Facility of INR 24,50,00,000/- (Facility Agreement dated 12.04.2019)\n"
        "• Discrepancy Found: Financial Creditor pleaded default date as 15.01.2023 in Form 1, but ledger statement "
        "annexed in Annexure B registered default on 28.02.2023.\n"
        "• Hallucinated Authority Cited: 'M/s Apex Infrastructure v. Punjab National Bank (2022) 14 SCC 992' — determined "
        "to be completely non-existent.\n"
        "• Testing Utility: Used to test Veritas Citation Reviewer (catches hallucinated citation) and Fact Reviewer "
        "(identifies date variance between Annexure B and Form 1)."
    )
    page2.insert_textbox(pymupdf.Rect(60, y, 535, y + 150), summary_text, fontsize=9, fontname="tiro")
    
    out_path = os.path.join(OUTPUT_DIR, "pooja-ramesh-singh-sc-2026.pdf")
    doc.save(out_path)
    doc.close()
    print("Saved:", out_path)

def create_ibc_section_7_pdf():
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    draw_header_footer(page, "The Insolvency and Bankruptcy Code, 2016", "Act No. 31 of 2016")
    
    y = 80
    page.insert_text(pymupdf.Point(140, y), "THE INSOLVENCY AND BANKRUPTCY CODE, 2016", fontsize=12, fontname="hebo", color=(0.15, 0.25, 0.35))
    y += 16
    page.insert_text(pymupdf.Point(210, y), "(ACT NO. 31 OF 2016)", fontsize=10, fontname="helv", color=(0.4, 0.45, 0.5))
    y += 20
    page.draw_line(pymupdf.Point(50, y), pymupdf.Point(545, y), color=(0.3, 0.5, 0.7), width=1)
    y += 25
    
    page.insert_text(pymupdf.Point(50, y), "SECTION 7: INITIATION OF CIRP BY FINANCIAL CREDITOR", fontsize=11, fontname="hebo", color=(0.15, 0.3, 0.45))
    y += 18
    
    s7_text = (
        "(1) A financial creditor either by itself or jointly with other financial creditors, or any other person on behalf "
        "of the financial creditor, may file an application for initiating corporate insolvency resolution process against a "
        "corporate debtor before the Adjudicating Authority when a default has occurred.\n\n"
        "Explanation.—For the purposes of this sub-section, a default includes a default in respect of a financial debt "
        "owed not only to the applicant financial creditor but to any other financial creditor of the corporate debtor.\n\n"
        "(2) The financial creditor shall make an application under sub-section (1) in such form and manner and accompanied "
        "with such fee as may be prescribed.\n\n"
        "(3) The financial creditor shall, along with the application furnish—\n"
        "    (a) record of the default recorded with the information utility or such other record or evidence of default as "
        "may be specified;\n"
        "    (b) the name of the resolution professional proposed to act as an interim resolution professional; and\n"
        "    (c) any other information as may be specified by the Board.\n\n"
        "(4) The Adjudicating Authority shall, within fourteen days of the receipt of the application under sub-section (2), "
        "ascertain the existence of a default from the records of an information utility or on the basis of other evidence "
        "furnished by the financial creditor under sub-section (3).\n\n"
        "(5) Where the Adjudicating Authority is satisfied that—\n"
        "    (a) a default has occurred and the application under sub-section (2) is complete, and there is no disciplinary "
        "proceeding pending against the proposed resolution professional, it may, by order, admit such application; or\n"
        "    (b) default has not occurred or the application under sub-section (2) is incomplete or any disciplinary "
        "proceeding is pending against the proposed resolution professional, it may, by order, reject such application:\n"
        "Provided that the Adjudicating Authority shall, before rejecting the application under clause (b), give a notice to the "
        "applicant to rectify the defect in his application within seven days of receipt of such notice from the Adjudicating Authority."
    )
    page.insert_textbox(pymupdf.Rect(50, y, 545, y + 360), s7_text, fontsize=8.8, fontname="tiro")
    y += 370
    
    page.draw_line(pymupdf.Point(50, y), pymupdf.Point(545, y), color=(0.8, 0.85, 0.9), width=0.8)
    y += 18
    page.insert_text(pymupdf.Point(50, y), "STATUTORY INTERPLAY: ARTICLE 137 & SECTION 18 OF LIMITATION ACT, 1963", fontsize=10, fontname="hebo", color=(0.8, 0.25, 0.1))
    y += 16
    
    limitation_text = (
        "• Article 137 Limitation: An application under Section 7 IBC is governed by Article 137 of the Limitation Act, 1963, "
        "prescribing a limitation period of three (3) years from the date on which default occurs (BK Educational Services v. Parag Gupta).\n"
        "• Section 18 Acknowledgment: Balance sheets, financial statements, and written OTS proposals signed by the Corporate Debtor "
        "constitute valid acknowledgment of debt under Section 18, resetting the limitation clock (Asset Reconstruction Company v. Bishal Homes)."
    )
    page.insert_textbox(pymupdf.Rect(50, y, 545, y + 80), limitation_text, fontsize=8.5, fontname="tiro")
    
    out_path = os.path.join(OUTPUT_DIR, "ibc-section-7-statute.pdf")
    doc.save(out_path)
    doc.close()
    print("Saved:", out_path)

def create_ibbi_form_1_pdf():
    doc = pymupdf.open()
    page1 = doc.new_page(width=595, height=842)
    draw_header_footer(page1, "Form 1 — Insolvency Application under Section 7", "IBBI/CIRP/FORM-1")
    
    y = 75
    page1.insert_text(pymupdf.Point(240, y), "FORM 1", fontsize=13, fontname="hebo")
    y += 15
    page1.insert_text(pymupdf.Point(190, y), "(See sub-rule (1) of rule 4)", fontsize=9, fontname="heit", color=(0.4, 0.4, 0.4))
    y += 20
    page1.insert_text(pymupdf.Point(85, y), "APPLICATION BY FINANCIAL CREDITOR TO INITIATE CORPORATE INSOLVENCY RESOLUTION PROCESS", fontsize=9.5, fontname="hebo", color=(0.15, 0.25, 0.35))
    y += 18
    page1.draw_line(pymupdf.Point(50, y), pymupdf.Point(545, y), color=(0.28, 0.48, 0.66), width=1)
    y += 20
    
    page1.insert_text(pymupdf.Point(50, y), "TO: The National Company Law Tribunal, Principal Bench, New Delhi", fontsize=9.5, fontname="tibo")
    y += 20
    
    def draw_part_header(p, text, cur_y):
        p.draw_rect(pymupdf.Rect(50, cur_y, 545, cur_y + 20), color=(0.7, 0.8, 0.9), fill=(0.92, 0.95, 0.98))
        p.insert_text(pymupdf.Point(60, cur_y + 14), text, fontsize=9.5, fontname="hebo", color=(0.15, 0.3, 0.45))
        return cur_y + 26
    
    y = draw_part_header(page1, "PART I: PARTICULARS OF APPLICANT (FINANCIAL CREDITOR)", y)
    part1_data = [
        ("1. Name of Financial Creditor", "Jammu and Kashmir Bank Limited"),
        ("2. Identification / CIN", "L65110JK1938SGC000048"),
        ("3. Address for Correspondence", "Corporate Banking Branch, Connaught Place, New Delhi - 110001"),
        ("4. Authorized Signatory", "Mr. Sanjeev Kumar, Chief General Manager (Power of Attorney dated 10.01.2021)"),
    ]
    for label, val in part1_data:
        page1.insert_text(pymupdf.Point(55, y), label, fontsize=8.5, fontname="hebo", color=(0.2, 0.2, 0.2))
        page1.insert_text(pymupdf.Point(240, y), val, fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        page1.draw_line(pymupdf.Point(50, y + 4), pymupdf.Point(545, y + 4), color=(0.9, 0.92, 0.95), width=0.5)
        y += 18
    
    y += 10
    y = draw_part_header(page1, "PART II: PARTICULARS OF CORPORATE DEBTOR", y)
    part2_data = [
        ("1. Corporate Debtor Name", "Essel Infraprojects Limited"),
        ("2. Corporate Identity Number (CIN)", "U45200MH1987PLC044094"),
        ("3. Registered Office Address", "Continental Building, 135 Dr. Annie Besant Road, Worli, Mumbai - 400018"),
        ("4. Nominal Share Capital", "INR 1,500,00,00,000/- (Paid up: INR 1,210,00,00,000/-)"),
    ]
    for label, val in part2_data:
        page1.insert_text(pymupdf.Point(55, y), label, fontsize=8.5, fontname="hebo", color=(0.2, 0.2, 0.2))
        page1.insert_text(pymupdf.Point(240, y), val, fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        page1.draw_line(pymupdf.Point(50, y + 4), pymupdf.Point(545, y + 4), color=(0.9, 0.92, 0.95), width=0.5)
        y += 18
        
    y += 10
    y = draw_part_header(page1, "PART III: PARTICULARS OF PROPOSED INTERIM RESOLUTION PROFESSIONAL", y)
    part3_data = [
        ("1. Name of Proposed IRP", "Mr. Arvind Kumar Shrivastava"),
        ("2. IBBI Registration Number", "IBBI/IPA-001/IP-P00452/2017-2018/10795"),
        ("3. Written Consent (Form 2)", "Annexed as Annexure A-1 with valid AFA (Authorization for Assignment)"),
    ]
    for label, val in part3_data:
        page1.insert_text(pymupdf.Point(55, y), label, fontsize=8.5, fontname="hebo", color=(0.2, 0.2, 0.2))
        page1.insert_text(pymupdf.Point(240, y), val, fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        page1.draw_line(pymupdf.Point(50, y + 4), pymupdf.Point(545, y + 4), color=(0.9, 0.92, 0.95), width=0.5)
        y += 18

    # Page 2: Part IV & Part V
    page2 = doc.new_page(width=595, height=842)
    draw_header_footer(page2, "Form 1 — Insolvency Application under Section 7", "IBBI/CIRP/FORM-1")
    
    y = 75
    y = draw_part_header(page2, "PART IV: PARTICULARS OF FINANCIAL DEBT & DEFAULT", y)
    part4_data = [
        ("1. Total Amount Granted", "INR 24,50,00,000/- (Sanction Letter dated 12.04.2019)"),
        ("2. Total Amount Claimed", "INR 29,82,41,802/- (Principal: INR 24.50 Cr + Interest & Penal Charges)"),
        ("3. Date on which Default Occurred", "15th January 2023 (Plead in Form 1 Application)"),
        ("4. Days of Continuous Default", "724 days prior to institution of present proceeding"),
    ]
    for label, val in part4_data:
        page2.insert_text(pymupdf.Point(55, y), label, fontsize=8.5, fontname="hebo", color=(0.2, 0.2, 0.2))
        page2.insert_text(pymupdf.Point(240, y), val, fontsize=8.5, fontname="hebo" if "15th January" in val else "helv", color=(0.8, 0.2, 0.1) if "15th January" in val else (0.1, 0.1, 0.1))
        page2.draw_line(pymupdf.Point(50, y + 4), pymupdf.Point(545, y + 4), color=(0.9, 0.92, 0.95), width=0.5)
        y += 18
        
    y += 15
    y = draw_part_header(page2, "PART V: EVIDENCE & DOCUMENTS PROVING DEBT AND DEFAULT", y)
    part5_data = [
        ("Annexure A", "Sanction Letter & Master Credit Facility Agreement dated 12.04.2019"),
        ("Annexure B", "Bank Statement / Certified Ledger Extract under Banker's Books Evidence Act (Default noted: 28.02.2023)"),
        ("Annexure C", "NeSL Information Utility Record of Default (Form D Certificate UDI-2024-ND-883921)"),
        ("Annexure D", "Balance Sheet of Corporate Debtor for FY 2022-23 reflecting admitted debt under Note 14"),
        ("Annexure E", "Demand Notice under Rule 4(3) dated 05.04.2023 with postal acknowledgment receipt"),
    ]
    for label, val in part5_data:
        page2.insert_text(pymupdf.Point(55, y), label, fontsize=8.5, fontname="hebo", color=(0.2, 0.2, 0.2))
        page2.insert_text(pymupdf.Point(145, y), val, fontsize=8.2, fontname="helv", color=(0.1, 0.1, 0.1))
        page2.draw_line(pymupdf.Point(50, y + 4), pymupdf.Point(545, y + 4), color=(0.9, 0.92, 0.95), width=0.5)
        y += 20
        
    y += 25
    notice_box = pymupdf.Rect(50, y, 545, y + 55)
    page2.draw_rect(notice_box, color=(0.85, 0.8, 0.7), fill=(0.99, 0.97, 0.95))
    page2.insert_text(pymupdf.Point(60, y + 15), "TESTING NOTE FOR VERITAS MULTI-AGENT WORKFLOW", fontsize=9, fontname="hebo", color=(0.75, 0.35, 0.1))
    page2.insert_text(pymupdf.Point(60, y + 32), "This application contains a documented factual discrepancy between Part IV Item 3 (15 Jan 2023)", fontsize=8.2, fontname="helv")
    page2.insert_text(pymupdf.Point(60, y + 44), "and Annexure B Ledger Statement (28 Feb 2023), activating Veritas Fact Reviewer conflict resolution.", fontsize=8.2, fontname="helv")
    
    out_path = os.path.join(OUTPUT_DIR, "ibbi-form-1-application.pdf")
    doc.save(out_path)
    doc.close()
    print("Saved:", out_path)

def create_facility_agreement_pdf():
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    draw_header_footer(page, "Master Credit Facility Agreement", "JKB/CP/TL-2019/884")
    
    y = 80
    page.insert_text(pymupdf.Point(130, y), "MASTER CREDIT FACILITY AGREEMENT", fontsize=13, fontname="tibo", color=(0.15, 0.25, 0.35))
    y += 18
    page.insert_text(pymupdf.Point(170, y), "TERM LOAN FACILITY OF INR 24,50,00,000/-", fontsize=10.5, fontname="tibo", color=(0.2, 0.25, 0.3))
    y += 22
    page.draw_line(pymupdf.Point(50, y), pymupdf.Point(545, y), color=(0.28, 0.48, 0.66), width=1)
    y += 25
    
    parties = (
        "THIS MASTER CREDIT FACILITY AGREEMENT is entered into on this 12th day of April, 2019, by and between:\n\n"
        "1. THE JAMMU AND KASHMIR BANK LIMITED, a banking company incorporated under the laws of India, having its "
        "Registered Office at M.A. Road, Srinagar, J&K, and Corporate Banking Branch at Connaught Place, New Delhi "
        "(hereinafter referred to as the 'Lender' or 'Financial Creditor');\n\n"
        "AND\n\n"
        "2. ESSEL INFRAPROJECTS LIMITED, a public limited company incorporated under the Companies Act, 1956, having its "
        "Registered Office at Continental Building, 135 Dr. Annie Besant Road, Worli, Mumbai - 400018 "
        "(hereinafter referred to as the 'Borrower' or 'Corporate Debtor')."
    )
    page.insert_textbox(pymupdf.Rect(50, y, 545, y + 120), parties, fontsize=8.8, fontname="tiro")
    y += 130
    
    page.insert_text(pymupdf.Point(50, y), "KEY TERMS AND CONDITIONS", fontsize=10.5, fontname="hebo", color=(0.15, 0.3, 0.45))
    y += 16
    
    terms = (
        "CLAUSE 2. FACILITY AMOUNT & DISBURSEMENT\n"
        "The Lender agrees to grant to the Borrower a Rupee Term Loan facility not exceeding INR 24,50,00,000/- "
        "(Rupees Twenty-Four Crores Fifty Lakhs only) for financing infrastructural development and road projects.\n\n"
        "CLAUSE 4. INTEREST AND REPAYMENT SCHEDULE\n"
        "Interest shall accrue at 11.25% per annum floating (1-year MCLR + 2.50%), payable on monthly rest. The Principal "
        "shall be repayable in 24 equal quarterly instalments of INR 1,02,08,333/- commencing from 30th September 2020.\n\n"
        "CLAUSE 9. EVENTS OF DEFAULT\n"
        "Each of the following occurrences constitutes an Event of Default:\n"
        "    (a) Payment Default: Failure by the Borrower to pay on the due date any sum payable under this Agreement;\n"
        "    (b) Cross-Default: Any default occurring under any other financial contract with any lender;\n"
        "    (c) Material Adverse Change: Any suspension or severe disruption of operations of the Borrower.\n\n"
        "CLAUSE 12. REMEDIES & STATUTORY PROCEEDINGS\n"
        "Upon occurrence of an Event of Default, the entire outstanding amount shall become immediately due and payable. "
        "The Lender shall be entitled to initiate proceedings under the Insolvency and Bankruptcy Code, 2016 before the "
        "Hon'ble National Company Law Tribunal, New Delhi / Mumbai Benches."
    )
    page.insert_textbox(pymupdf.Rect(50, y, 545, y + 240), terms, fontsize=8.6, fontname="tiro")
    y += 250
    
    # Signatures
    page.draw_line(pymupdf.Point(50, y), pymupdf.Point(545, y), color=(0.85, 0.88, 0.92), width=0.8)
    y += 25
    page.insert_text(pymupdf.Point(70, y), "For THE J&K BANK LIMITED", fontsize=9, fontname="hebo")
    page.insert_text(pymupdf.Point(360, y), "For ESSEL INFRAPROJECTS LIMITED", fontsize=9, fontname="hebo")
    y += 35
    page.insert_text(pymupdf.Point(70, y), "[Sd/- Sanjeev Kumar, CGM]", fontsize=8.5, fontname="tiit")
    page.insert_text(pymupdf.Point(360, y), "[Sd/- Pooja Ramesh Singh, Director]", fontsize=8.5, fontname="tiit")
    
    out_path = os.path.join(OUTPUT_DIR, "sanction-facility-agreement.pdf")
    doc.save(out_path)
    doc.close()
    print("Saved:", out_path)

def create_nesl_record_of_default_pdf():
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    draw_header_footer(page, "National E-Governance Services Ltd (NeSL) — Information Utility", "IU/AUTH/2024/0912")
    
    y = 75
    page.insert_text(pymupdf.Point(150, y), "NATIONAL E-GOVERNANCE SERVICES LIMITED", fontsize=11.5, fontname="hebo", color=(0.15, 0.25, 0.35))
    y += 15
    page.insert_text(pymupdf.Point(180, y), "INFORMATION UTILITY UNDER IBC, 2016", fontsize=9, fontname="helv", color=(0.4, 0.45, 0.5))
    y += 18
    page.draw_line(pymupdf.Point(50, y), pymupdf.Point(545, y), color=(0.28, 0.48, 0.66), width=1)
    y += 22
    
    page.insert_text(pymupdf.Point(170, y), "RECORD OF DEFAULT — FORM D CERTIFICATE", fontsize=11, fontname="hebo", color=(0.8, 0.2, 0.1))
    y += 15
    page.insert_text(pymupdf.Point(150, y), "[Issued under Regulation 21A of IBBI (IU) Regulations, 2017]", fontsize=8.5, fontname="heit", color=(0.45, 0.5, 0.55))
    y += 25
    
    cert_box = pymupdf.Rect(50, y, 545, y + 45)
    page.draw_rect(cert_box, color=(0.8, 0.3, 0.2), fill=(1.0, 0.96, 0.95))
    page.insert_text(pymupdf.Point(60, y + 16), "DEFAULT STATUS: AUTHENTICATED (STATUS CODE: 100 - RED)", fontsize=10, fontname="hebo", color=(0.8, 0.15, 0.1))
    page.insert_text(pymupdf.Point(60, y + 32), "Information of Default submitted by Financial Creditor deemed authenticated under Section 215(3) IBC.", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
    y += 60
    
    headers = [
        ("Unique Debt Identifier (UDI)", "UDI-2024-ND-883921"),
        ("Financial Creditor Name", "Jammu and Kashmir Bank Ltd."),
        ("Financial Creditor CIN / PAN", "L65110JK1938SGC000048 / AAACJ0049F"),
        ("Corporate Debtor Name", "Essel Infraprojects Limited"),
        ("Corporate Debtor CIN", "U45200MH1987PLC044094"),
        ("Total Sanctioned Limit", "INR 24,50,00,000/-"),
        ("Total Amount Outstanding in Default", "INR 29,82,41,802/-"),
        ("DATE OF DEFAULT RECORDED", "15-JAN-2023"),
        ("Date of IU Filing by Creditor", "04-MAR-2023"),
        ("Date of Notice Sent to Debtor", "06-MAR-2023"),
        ("Authentication Status", "Deemed Authenticated (No dispute raised within 7 days)"),
    ]
    for label, val in headers:
        page.insert_text(pymupdf.Point(55, y), label, fontsize=8.5, fontname="hebo", color=(0.2, 0.2, 0.2))
        page.insert_text(pymupdf.Point(250, y), val, fontsize=8.5, fontname="hebo" if "DATE OF DEFAULT" in label else "helv", color=(0.8, 0.15, 0.1) if "DATE OF DEFAULT" in label else (0.1, 0.1, 0.1))
        page.draw_line(pymupdf.Point(50, y + 4), pymupdf.Point(545, y + 4), color=(0.9, 0.92, 0.95), width=0.5)
        y += 20
        
    y += 20
    cert_text = (
        "CERTIFICATE OF INFORMATION UTILITY:\n"
        "This is to certify that the details of the financial debt and default stated above have been stored and "
        "processed by National E-Governance Services Limited (NeSL) in accordance with the provisions of Section 215 "
        "of the Insolvency and Bankruptcy Code, 2016 and IBBI (Information Utilities) Regulations, 2017.\n\n"
        "This Record of Default in Form D is admissible as prima facie evidence of default before the National Company Law Tribunal "
        "under Section 7(4) of the IBC without requiring further proof of default."
    )
    page.insert_textbox(pymupdf.Rect(50, y, 545, y + 80), cert_text, fontsize=8.5, fontname="tiro")
    
    out_path = os.path.join(OUTPUT_DIR, "nesl-record-of-default.pdf")
    doc.save(out_path)
    doc.close()
    print("Saved:", out_path)

if __name__ == "__main__":
    create_pooja_ramesh_singh_pdf()
    create_ibc_section_7_pdf()
    create_ibbi_form_1_pdf()
    create_facility_agreement_pdf()
    create_nesl_record_of_default_pdf()
    print("All 5 problem statement PDFs generated successfully!")
