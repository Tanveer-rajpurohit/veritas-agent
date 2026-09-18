from typing import Any

from app.schemas.legal_sources.template import (
    DraftTemplate,
    TemplateSummary,
)

VIDHIK_PROVENANCE = (
    "Informed by the VidhikDastaavej legal drafting methodology "
    "(https://github.com/ShubhamKumarNigam/VidhikDastaavej, https://arxiv.org/abs/2504.03486). "
    "Curated drafting template providing starting structure requiring lawyer review; "
    "not legal evidence or official court filing forms."
)

TEMPLATES_RAW: list[dict[str, Any]] = [
    {
        "template_id": "ibc_section_7_working_brief",
        "name": "IBC Section 7 Working Brief",
        "jurisdiction": "india",
        "document_type": "working_brief",
        "version": 1,
        "description": "Curated working brief for an application by a Financial Creditor under Section 7 of the Insolvency and Bankruptcy Code, 2016.",
        "purpose": "Provide a structured working brief for counsel to organize debt particulars, default dates, and statutory ingredients before drafting an NCLT application.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "financial_creditor_name",
                "question": "Who is the financial creditor?",
                "evidence_required": True,
            },
            {
                "key": "corporate_debtor_name",
                "question": "Who is the corporate debtor?",
                "evidence_required": True,
            },
            {
                "key": "total_default_amount",
                "question": "What is the total financial debt and default amount?",
                "evidence_required": True,
            },
            {
                "key": "default_date",
                "question": "What is the date on which default occurred?",
                "evidence_required": True,
            },
            {
                "key": "demand_notice_date",
                "question": "When was the loan recall or demand notice issued?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "parties",
                "heading": "Parties and Corporate Debtor Particulars",
                "purpose": "Identify the applicant financial creditor and corporate debtor with CIN and registered office.",
                "required": True,
                "drafting_rules": ["Use only Matter records or explicitly user-supplied facts."],
            },
            {
                "section_id": "synopsis",
                "heading": "Brief Synopsis of Financial Debt and Default",
                "purpose": "Summarize the facility disbursed, repayment schedule, and occurrence of default exceeding threshold.",
                "required": True,
                "drafting_rules": ["Anchor default amount directly in bank records or NeSL certificate."],
            },
            {
                "section_id": "facts",
                "heading": "Chronology of Material Facts",
                "purpose": "Chronological facts of loan sanction, disbursement, default notices, and acknowledgment of debt.",
                "required": True,
                "drafting_rules": ["Present atomic statements with precise dates."],
            },
            {
                "section_id": "statutory_compliance",
                "heading": "Statutory Ingredients under Section 7 of IBC",
                "purpose": "Establish existence of financial debt and occurrence of default under Section 7(5)(a).",
                "required": True,
                "drafting_rules": ["Quote Section 7 provisions using verified statutory citations."],
            },
            {
                "section_id": "grounds",
                "heading": "Grounds for Admission of CIRP",
                "purpose": "Enumerate legal grounds showing no dispute on default and eligibility of interim resolution professional.",
                "required": True,
                "drafting_rules": ["Cite governing NCLAT and Supreme Court precedents."],
            },
            {
                "section_id": "prayer",
                "heading": "Relief Sought",
                "purpose": "Formal prayer for initiation of corporate insolvency resolution process and moratorium declaration.",
                "required": True,
                "drafting_rules": ["Formulate standard NCLT prayer clauses."],
            },
        ],
        "limitations": [
            "Working brief only; not the official Form 1 filing form prescribed under the Insolvency and Bankruptcy (Application to Adjudicating Authority) Rules, 2016.",
            "NCLT and NCLAT filing requirements must be confirmed against current IBBI regulations.",
            "Starting structure requiring lawyer review; not legal evidence.",
        ],
    },
    {
        "template_id": "legal_notice_payment_demand",
        "name": "Commercial Legal Notice for Payment Demand",
        "jurisdiction": "india",
        "document_type": "legal_notice",
        "version": 1,
        "description": "Pre-litigation advocate notice demanding payment of outstanding commercial debts or contractual dues.",
        "purpose": "Provide a pre-litigation advocate notice demanding payment of admitted commercial debts or invoice dues.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "claimant_name",
                "question": "Who is the claimant / creditor issuing the notice?",
                "evidence_required": True,
            },
            {
                "key": "recipient_name",
                "question": "Who is the recipient / defaulting debtor?",
                "evidence_required": True,
            },
            {
                "key": "outstanding_principal",
                "question": "What is the principal outstanding debt amount?",
                "evidence_required": True,
            },
            {
                "key": "interest_rate",
                "question": "What is the claimed interest rate and contractual basis?",
                "evidence_required": True,
            },
            {
                "key": "due_date",
                "question": "What was the contractual due date for payment?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "counsel_header",
                "heading": "Advocate Representation and Instructions",
                "purpose": "Establish that counsel acts under specific instructions on behalf of the named client.",
                "required": True,
                "drafting_rules": ["State advocate chamber and client instructions clearly."],
            },
            {
                "section_id": "transaction_background",
                "heading": "Contractual Relationship and Invoicing",
                "purpose": "Outline the commercial contract, purchase orders, delivery receipts, and invoices raised.",
                "required": True,
                "drafting_rules": ["Reference verified invoice numbers and delivery acknowledgments."],
            },
            {
                "section_id": "default_particulars",
                "heading": "Failure of Payment and Breach",
                "purpose": "Detail the default, dishonoured payment promises, and outstanding balance.",
                "required": True,
                "drafting_rules": ["Provide atomic breakdown of principal and interest claimed."],
            },
            {
                "section_id": "demand_and_requisition",
                "heading": "Peremptory Demand for Payment",
                "purpose": "Call upon debtor to pay full amount within 15 days of notice receipt.",
                "required": True,
                "drafting_rules": ["Specify 15-day rectification window and payment bank account."],
            },
            {
                "section_id": "litigation_warning",
                "heading": "Warning of Legal Proceedings",
                "purpose": "Notify recipient that failure to comply will lead to civil suit, commercial proceedings, or arbitration.",
                "required": True,
                "drafting_rules": ["Reserve all rights to costs, damages, and legal remedies."],
            },
        ],
        "limitations": [
            "Generic commercial demand notice; starting structure requiring lawyer review.",
            "Does NOT satisfy the mandatory statutory notice requirements under Section 138 of the Negotiable Instruments Act, 1881 (which requires 15-day cheque dishonour notice within 30 days of memo) or Section 8 of the Insolvency and Bankruptcy Code, 2016 (Form 3/4 demand notice with invoice copies).",
            "Forum-specific filing and limitation requirements must be confirmed.",
        ],
    },
    {
        "template_id": "general_affidavit",
        "name": "General Evidentiary Affidavit",
        "jurisdiction": "india",
        "document_type": "affidavit",
        "version": 1,
        "description": "Curated evidentiary affirmation of facts for use in civil or commercial judicial proceedings.",
        "purpose": "Provide a structured evidentiary affirmation of facts for use in civil or commercial judicial proceedings.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "deponent_name",
                "question": "Who is the deponent swearing the affidavit?",
                "evidence_required": True,
            },
            {
                "key": "deponent_age_parentage",
                "question": "What is deponent's age, parentage, and residential address?",
                "evidence_required": True,
            },
            {
                "key": "deponent_competence",
                "question": "In what capacity is the deponent authorized to affirm?",
                "evidence_required": True,
            },
            {
                "key": "proceeding_title",
                "question": "What is the title and number of the judicial proceeding?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "court_cause_title",
                "heading": "Court / Forum and Cause Title",
                "purpose": "Identify court jurisdiction, suit number, and parties.",
                "required": True,
                "drafting_rules": ["Specify court, suit number, and party names."],
            },
            {
                "section_id": "deponent_identity",
                "heading": "Deponent Declaration and Competence",
                "purpose": "Declare name, age, address, and competence to testify or depose.",
                "required": True,
                "drafting_rules": ["State personal knowledge and authorization."],
            },
            {
                "section_id": "factual_affirmations",
                "heading": "Numbered Factual Statements",
                "purpose": "Chronological sworn statements of fact.",
                "required": True,
                "drafting_rules": ["Keep each affirmation atomic and specific."],
            },
            {
                "section_id": "document_annexures",
                "heading": "Identification of Marked Exhibits",
                "purpose": "Formally identify and tender documents annexed as true copies.",
                "required": True,
                "drafting_rules": ["Refer to marked exhibits systematically."],
            },
            {
                "section_id": "verification",
                "heading": "Formal Verification Clause",
                "purpose": "Verify statements true to knowledge versus derived from legal advice or records.",
                "required": True,
                "drafting_rules": ["Distinguish personal knowledge from records."],
            },
        ],
        "limitations": [
            "Curated drafting template; starting structure requiring lawyer review.",
            "Must be sworn before an Oath Commissioner, Notary Public, or judicial officer per High Court Rules.",
            "Verification clause must strictly separate personal knowledge from legal advice or derived records.",
        ],
    },
    {
        "template_id": "petition_general",
        "name": "General Petition (Commercial Forum / Tribunal)",
        "jurisdiction": "india",
        "document_type": "petition",
        "version": 1,
        "description": "General petition structure for original applications before commercial forums or tribunals.",
        "purpose": "Provide an initial petition outline for invoking original jurisdiction before a commercial court, tribunal, or civil forum.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "petitioner_name",
                "question": "Who is the petitioner entity?",
                "evidence_required": True,
            },
            {
                "key": "respondent_name",
                "question": "Who is the respondent entity?",
                "evidence_required": True,
            },
            {
                "key": "jurisdictional_clause",
                "question": "Under what statutory provision is the petition filed?",
                "evidence_required": True,
            },
            {
                "key": "cause_of_action_date",
                "question": "When and where did the cause of action arise?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "cause_title",
                "heading": "Cause Title and Forum Header",
                "purpose": "State the forum, jurisdiction, petitioner, and respondent particulars.",
                "required": True,
                "drafting_rules": ["Specify court and full party details."],
            },
            {
                "section_id": "jurisdiction_limitation",
                "heading": "Jurisdiction and Limitation Statement",
                "purpose": "Show forum possesses pecuniary/territorial jurisdiction and petition is within limitation.",
                "required": True,
                "drafting_rules": ["Anchor limitation date directly in facts."],
            },
            {
                "section_id": "material_facts",
                "heading": "Statement of Material Facts",
                "purpose": "State facts establishing petitioner's right, respondent's infringement, and injury suffered.",
                "required": True,
                "drafting_rules": ["Group facts logically with evidentiary cross-references."],
            },
            {
                "section_id": "grounds",
                "heading": "Grounds for Petition",
                "purpose": "Enumerate substantive legal and equitable grounds.",
                "required": True,
                "drafting_rules": ["Present discrete grounds supported by statute and case law."],
            },
            {
                "section_id": "prayer",
                "heading": "Prayer Clause",
                "purpose": "Specify precise primary, interim, and cost reliefs claimed.",
                "required": True,
                "drafting_rules": ["Formulate distinct sub-prayers clearly."],
            },
        ],
        "limitations": [
            "Curated drafting template; starting structure requiring lawyer review.",
            "Tribunal-specific rules (e.g. NCLT Rules, DRT Regulations) and High Court Original Side rules differ substantially and are not interchangeable.",
            "Forum-specific filing requirements must be confirmed.",
        ],
    },
    {
        "template_id": "plaint_civil",
        "name": "Civil Plaint (CPC Order VII)",
        "jurisdiction": "india",
        "document_type": "plaint",
        "version": 1,
        "description": "Civil suit plaint structure conforming to Order VII Rules 1-11 of the Code of Civil Procedure, 1908.",
        "purpose": "Provide a structural civil suit plaint under Order VII of the Code of Civil Procedure, 1908.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "plaintiff_particulars",
                "question": "Who is the plaintiff?",
                "evidence_required": True,
            },
            {
                "key": "defendant_particulars",
                "question": "Who is the defendant?",
                "evidence_required": True,
            },
            {
                "key": "suit_valuation",
                "question": "What is the valuation of suit for court fees and jurisdiction?",
                "evidence_required": True,
            },
            {
                "key": "cause_of_action",
                "question": "On what date and place did the cause of action arise?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "plaint_cause_title",
                "heading": "Court Header and Party Memorandums",
                "purpose": "State trial court, suit title, plaintiff, and defendant details per Order VII Rule 1.",
                "required": True,
                "drafting_rules": ["State addresses and jurisdiction clearly."],
            },
            {
                "section_id": "facts_constituting_cause",
                "heading": "Facts Constituting Cause of Action",
                "purpose": "State material facts in concise form without pleading evidence per Order VI Rule 2.",
                "required": True,
                "drafting_rules": ["Plead material facts, not evidence."],
            },
            {
                "section_id": "cause_of_action_timing",
                "heading": "Date and Place of Cause of Action",
                "purpose": "Specify when cause of action arose to demonstrate suit is within limitation.",
                "required": True,
                "drafting_rules": ["Specify date and accrual events precisely."],
            },
            {
                "section_id": "court_fee_valuation",
                "heading": "Valuation and Court Fee",
                "purpose": "State valuation for pecuniary jurisdiction and court fee payment per Court Fees Act.",
                "required": True,
                "drafting_rules": ["State court fees calculation under applicable State Court Fees Act."],
            },
            {
                "section_id": "prayer",
                "heading": "Relief Claimed",
                "purpose": "State specific reliefs sought (decree for money, declaration, injunction).",
                "required": True,
                "drafting_rules": ["Enumerate specific heads of relief."],
            },
            {
                "section_id": "verification",
                "heading": "Verification of Pleadings",
                "purpose": "Formal verification under Order VI Rule 15 CPC.",
                "required": True,
                "drafting_rules": ["Verify specific paragraphs from knowledge and advice."],
            },
        ],
        "limitations": [
            "Civil plaint structure under Order VII CPC; starting structure requiring lawyer review.",
            "Commercial suits require mandatory pre-institution mediation under Section 12A of the Commercial Courts Act, 2015 unless urgent interim relief is sought.",
            "Court fee valuation and territorial/pecuniary jurisdiction rules must be confirmed per local state laws.",
        ],
    },
    {
        "template_id": "written_statement",
        "name": "Written Statement (CPC Order VIII)",
        "jurisdiction": "india",
        "document_type": "written_statement",
        "version": 1,
        "description": "Defence pleading in response to a plaint under Order VIII of the Code of Civil Procedure, 1908.",
        "purpose": "Provide a structured defence pleading in response to a plaint under Order VIII of the Code of Civil Procedure, 1908.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "defendant_name",
                "question": "Who is the answering defendant?",
                "evidence_required": True,
            },
            {
                "key": "suit_number",
                "question": "What is the civil suit number and plaintiff name?",
                "evidence_required": True,
            },
            {
                "key": "summons_service_date",
                "question": "When was the summons served upon the defendant?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "cause_title",
                "heading": "Cause Title and Defendant Representation",
                "purpose": "Identify the suit, answering defendant, and advocate on record.",
                "required": True,
                "drafting_rules": ["State representation clearly."],
            },
            {
                "section_id": "preliminary_objections",
                "heading": "Preliminary Objections",
                "purpose": "Raise legal bars including limitation, maintainability, lack of cause of action, and jurisdiction.",
                "required": True,
                "drafting_rules": ["Raise maintainability and limitation bars upfront."],
            },
            {
                "section_id": "parawise_reply",
                "heading": "Parawise Reply on Merits",
                "purpose": "Respond specifically to each paragraph of the plaint without general denials (Order VIII Rule 3 & 5).",
                "required": True,
                "drafting_rules": ["Deny specific allegations specifically; general denial is deemed admission."],
            },
            {
                "section_id": "special_defence",
                "heading": "Additional Facts and Special Defence",
                "purpose": "Set forth new facts constituting set-off, counter-claim, or independent defence.",
                "required": False,
                "drafting_rules": ["Formulate counter-claim per Order VIII Rule 6A if applicable."],
            },
            {
                "section_id": "prayer",
                "heading": "Prayer for Dismissal",
                "purpose": "Formal prayer for dismissal of the suit with exemplary costs.",
                "required": True,
                "drafting_rules": ["Pray for dismissal with costs under Section 35A CPC."],
            },
        ],
        "limitations": [
            "Filing deadlines differ strictly by forum: 30 days from summons service under Order VIII Rule 1 CPC (extendable up to 90 days for cause), compared to a strict 120-day hard stop with forfeiture of defence in Commercial Courts under the Commercial Courts Act, 2015.",
            "Every material factual allegation not denied specifically is deemed admitted under Rule 5 CPC.",
            "Starting structure requiring lawyer review.",
        ],
    },
    {
        "template_id": "written_submissions",
        "name": "Written Submissions / Brief of Arguments",
        "jurisdiction": "india",
        "document_type": "submissions",
        "version": 1,
        "description": "Comprehensive written synopsis of arguments under Order XVIII Rule 2(3A) CPC or Supreme Court practice.",
        "purpose": "Provide structured written arguments summarizing pleadings, oral submissions, and governing precedent for final hearing.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "appearing_party",
                "question": "For which party are these submissions prepared?",
                "evidence_required": True,
            },
            {
                "key": "main_issues",
                "question": "What are the framed issues or points for determination?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "matter_summary",
                "heading": "Factual Synopsis and Procedural History",
                "purpose": "Summary of facts, pleadings, and procedural posture before the court.",
                "required": True,
                "drafting_rules": ["Keep chronology concise with record citations."],
            },
            {
                "section_id": "issues_framed",
                "heading": "Issues for Determination",
                "purpose": "List framed issues and questions of law to be answered.",
                "required": True,
                "drafting_rules": ["State issues exactly as framed by the court."],
            },
            {
                "section_id": "argument_on_issues",
                "heading": "Point-Wise Submissions with Evidence and Precedent",
                "purpose": "Detailed legal and factual arguments grouped under each framed issue.",
                "required": True,
                "drafting_rules": ["Anchor arguments to exact witness depositions and precedent extracts."],
            },
            {
                "section_id": "precedent_distinction",
                "heading": "Distinction of Authorities Cited by Opponent",
                "purpose": "Distinguish cases and principles cited by the opposing party.",
                "required": False,
                "drafting_rules": ["Distinguish adverse precedents on facts and ratio."],
            },
            {
                "section_id": "conclusion_relief",
                "heading": "Conclusion and Precise Relief Sought",
                "purpose": "Final summary statement of relief requested from the court.",
                "required": True,
                "drafting_rules": ["Restate conclusion concisely."],
            },
        ],
        "limitations": [
            "Curated drafting template; starting structure requiring lawyer review.",
            "Must comply with page and length limits under Order XVIII Rule 2(3A) CPC or Supreme Court Practice Directions.",
            "Citations must be verified against official certified law reports.",
        ],
    },
    {
        "template_id": "reply_counter_affidavit",
        "name": "Reply / Counter Affidavit",
        "jurisdiction": "india",
        "document_type": "reply",
        "version": 1,
        "description": "Counter-affidavit answering applications, writ petitions, or interim injunction pleas.",
        "purpose": "Provide a structured parawise response and counter-affidavit answering an opponent's application or petition.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "answering_party",
                "question": "Who is the answering respondent?",
                "evidence_required": True,
            },
            {
                "key": "petition_date",
                "question": "What is the date of the petition or application being answered?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "cause_title",
                "heading": "Cause Title and Appearance",
                "purpose": "Identify the main proceedings and replying respondent.",
                "required": True,
                "drafting_rules": ["State respondent particulars."],
            },
            {
                "section_id": "preliminary_submissions",
                "heading": "Preliminary Submissions and True Facts",
                "purpose": "Disclose true facts suppressed by applicant and establish lack of prima facie case.",
                "required": True,
                "drafting_rules": ["Demonstrate suppression of material facts."],
            },
            {
                "section_id": "parawise_reply",
                "heading": "Parawise Rebuttal of Petition Allegations",
                "purpose": "Parawise reply to each allegation in the applicant's petition.",
                "required": True,
                "drafting_rules": ["Traverse each paragraph specifically."],
            },
            {
                "section_id": "verification",
                "heading": "Deponent Verification",
                "purpose": "Deponent sworn verification clause.",
                "required": True,
                "drafting_rules": ["Follow state high court affidavit rules."],
            },
        ],
        "limitations": [
            "Curated drafting template; starting structure requiring lawyer review.",
            "Parawise rebuttal must correspond directly to paragraphs of the main petition.",
            "High Court, NCLT, and Civil Court affidavit requirements must be confirmed.",
        ],
    },
    {
        "template_id": "rejoinder",
        "name": "Rejoinder Affidavit",
        "jurisdiction": "india",
        "document_type": "rejoinder",
        "version": 1,
        "description": "Rejoinder affidavit strictly rebutting new facts raised in the counter-affidavit.",
        "purpose": "Provide a structured rejoinder affidavit addressing new assertions raised in the counter-affidavit.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "petitioner_deponent",
                "question": "Who is the petitioner deponent filing rejoinder?",
                "evidence_required": True,
            },
            {
                "key": "reply_affidavit_date",
                "question": "What is the date of the counter-affidavit being rejoined?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "rejoinder_preamble",
                "heading": "Scope of Rejoinder",
                "purpose": "Reiterate petition assertions and state that reply raises unfounded defences.",
                "required": True,
                "drafting_rules": ["Do not introduce new causes of action."],
            },
            {
                "section_id": "parawise_rebuttal",
                "heading": "Rebuttal to Preliminary Objections and False Assertions",
                "purpose": "Refute specific new allegations made in the counter-affidavit.",
                "required": True,
                "drafting_rules": ["Address only new facts raised in reply."],
            },
            {
                "section_id": "reaffirmation_verification",
                "heading": "Reaffirmation and Verification",
                "purpose": "Reaffirm original prayer and verify rejoinder statements.",
                "required": True,
                "drafting_rules": ["Affirm truth of statements on oath."],
            },
        ],
        "limitations": [
            "Curated drafting template; starting structure requiring lawyer review.",
            "Rejoinder cannot introduce a new cause of action or substitute for the original pleading.",
            "Requires leave of the court or tribunal where prescribed by forum rules.",
        ],
    },
    {
        "template_id": "interlocutory_application",
        "name": "Interlocutory Application (IA / Interim Relief)",
        "jurisdiction": "india",
        "document_type": "ia",
        "version": 1,
        "description": "Formal application for interim injunction or direction under Order XXXIX CPC or Section 151 CPC.",
        "purpose": "Provide a formal application seeking interim, urgent, or ancillary relief during the pendency of main proceedings.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "applicant_name",
                "question": "Who is the applicant seeking interim relief?",
                "evidence_required": True,
            },
            {
                "key": "urgent_relief_sought",
                "question": "What specific interim injunction or stay is requested?",
                "evidence_required": True,
            },
            {
                "key": "imminent_threat",
                "question": "What imminent injury will occur if stay is not granted?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "ia_cause_title",
                "heading": "Forum Header and Application Particulars",
                "purpose": "Identify main suit/petition number and statutory provision invoked.",
                "required": True,
                "drafting_rules": ["Specify provision (Order XXXIX Rules 1 & 2 / Section 151 CPC)."],
            },
            {
                "section_id": "urgency_and_threat",
                "heading": "Circumstances of Urgency and Apprehended Injury",
                "purpose": "Plead imminent danger of asset dissipation, breach of contract, or third-party rights creation.",
                "required": True,
                "drafting_rules": ["Plead urgent date of apprehension."],
            },
            {
                "section_id": "triple_test_injunction",
                "heading": "Satisfaction of the Triple Test for Interim Relief",
                "purpose": "Establish prima facie case, balance of convenience, and irreparable injury.",
                "required": True,
                "drafting_rules": ["Explicitly articulate all three limbs of the injunction test."],
            },
            {
                "section_id": "prayer",
                "heading": "Interim Prayer",
                "purpose": "Specify ex-parte ad-interim and interim orders sought.",
                "required": True,
                "drafting_rules": ["Include ex-parte ad-interim prayer clause."],
            },
        ],
        "limitations": [
            "Curated drafting template under Order XXXIX CPC or Section 151 CPC; starting structure requiring lawyer review.",
            "Triple test for interim injunction (prima facie case, balance of convenience, irreparable injury) must be established on verified facts.",
            "Forum-specific application forms must be confirmed.",
        ],
    },
    {
        "template_id": "memorandum_of_appeal",
        "name": "Memorandum of Appeal (Civil / Appellate Tribunal)",
        "jurisdiction": "india",
        "document_type": "appeal",
        "version": 1,
        "description": "Appellate pleading challenging an impugned judgment or order under Section 96 / Order XLI CPC or Section 61 IBC.",
        "purpose": "Provide a structured formal appeal challenging an adverse decree, judgment, or final tribunal order.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "appellant_name",
                "question": "Who is the appellant?",
                "evidence_required": True,
            },
            {
                "key": "impugned_order_date",
                "question": "What is the date of the impugned judgment or decree?",
                "evidence_required": True,
            },
            {
                "key": "lower_forum_name",
                "question": "Which court or tribunal passed the impugned order?",
                "evidence_required": True,
            },
            {
                "key": "appeal_limitation_days",
                "question": "What is the statutory limitation period for filing this appeal?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "appellate_cause_title",
                "heading": "Appellate Forum Header and Cause Title",
                "purpose": "State appellate court, appeal number, and appellant/respondent details.",
                "required": True,
                "drafting_rules": ["Reference trial court suit number and order date."],
            },
            {
                "section_id": "impugned_order_summary",
                "heading": "Summary of Impugned Order and Error of Law",
                "purpose": "Summarize operative direction of lower court and identify core legal error.",
                "required": True,
                "drafting_rules": ["Quote operative paragraphs of impugned decree."],
            },
            {
                "section_id": "limitation_statement",
                "heading": "Limitation and Certified Copy Particulars",
                "purpose": "Account for days taken in obtaining certified copy under Section 12 Limitation Act.",
                "required": True,
                "drafting_rules": ["Provide calculation of days excluding certified copy preparation."],
            },
            {
                "section_id": "grounds_of_appeal",
                "heading": "Enumerated Grounds of Appeal",
                "purpose": "Distinct, numbered grounds without narrative argument per Order XLI Rule 1.",
                "required": True,
                "drafting_rules": ["Present discrete grounds of law and fact concisely."],
            },
            {
                "section_id": "prayer",
                "heading": "Appellate Relief Claimed",
                "purpose": "Prayer to set aside impugned order and grant consequential relief.",
                "required": True,
                "drafting_rules": ["Pray for setting aside decree and stay during pendency."],
            },
        ],
        "limitations": [
            "Curated drafting template under Section 96 / Order XLI CPC, Section 61 IBC, or Section 37 Arbitration Act; starting structure requiring lawyer review.",
            "Appellate timelines are jurisdictional (e.g. 30 days under IBC Section 61, extendable by only 15 days for sufficient cause).",
            "Grounds of appeal must specify errors of law or jurisdiction without narrative argument.",
        ],
    },
    {
        "template_id": "arbitration_notice",
        "name": "Notice Invoking Arbitration (Section 21)",
        "jurisdiction": "india",
        "document_type": "arbitration_notice",
        "version": 1,
        "description": "Statutory notice invoking arbitration under Section 21 of the Arbitration and Conciliation Act, 1996.",
        "purpose": "Provide a formal notice invoking statutory arbitration under Section 21 of the Arbitration and Conciliation Act, 1996.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "claimant_name",
                "question": "Who is the party invoking arbitration?",
                "evidence_required": True,
            },
            {
                "key": "contract_date",
                "question": "What is the date of the underlying agreement?",
                "evidence_required": True,
            },
            {
                "key": "arbitration_clause_number",
                "question": "Which clause contains the arbitration agreement?",
                "evidence_required": True,
            },
            {
                "key": "disputes_arisen",
                "question": "What are the brief disputes and financial claims?",
                "evidence_required": True,
            },
            {
                "key": "arbitrator_nomination",
                "question": "Who is nominated or proposed as sole arbitrator?",
                "evidence_required": False,
            },
        ],
        "sections": [
            {
                "section_id": "agreement_and_clause",
                "heading": "Agreement and Arbitration Clause",
                "purpose": "Quote arbitration clause and establish seat, venue, and governing law.",
                "required": True,
                "drafting_rules": ["Quote arbitration clause verbatim."],
            },
            {
                "section_id": "disputes_summary",
                "heading": "Nature of Disputes and Monetary Claims",
                "purpose": "Briefly set out disputes and quantified claims subject to reference.",
                "required": True,
                "drafting_rules": ["Quantify monetary claims and nature of breaches."],
            },
            {
                "section_id": "invocation_and_reference",
                "heading": "Formal Invocation under Section 21",
                "purpose": "Expressly invoke Section 21 commencing arbitral proceedings.",
                "required": True,
                "drafting_rules": ["Expressly invoke Section 21 of the Act."],
            },
            {
                "section_id": "nomination_call",
                "heading": "Nomination of Arbitrator / Call to Concur",
                "purpose": "Propose sole arbitrator or call upon opponent to appoint per agreement.",
                "required": True,
                "drafting_rules": ["Provide nominee details and 30-day concurrence deadline."],
            },
        ],
        "limitations": [
            "Curated drafting template; starting structure requiring lawyer review.",
            "Arbitral proceedings commence on the date the respondent receives this request under Section 21.",
            "Must strictly comply with the dispute escalation and notice clause of the underlying agreement.",
        ],
    },
    {
        "template_id": "settlement_agreement",
        "name": "Commercial Settlement Agreement and Release",
        "jurisdiction": "india",
        "document_type": "agreement",
        "version": 1,
        "description": "Compromise and settlement deed resolving disputed commercial claims with mutual release.",
        "purpose": "Provide a formal contractual compromise and release resolving pending disputes between parties.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "first_party",
                "question": "Who is party of the first part?",
                "evidence_required": True,
            },
            {
                "key": "second_party",
                "question": "Who is party of the second part?",
                "evidence_required": True,
            },
            {
                "key": "dispute_summary",
                "question": "What is the summary of existing disputes?",
                "evidence_required": True,
            },
            {
                "key": "settlement_consideration",
                "question": "What is the agreed settlement amount and payment terms?",
                "evidence_required": True,
            },
            {
                "key": "release_terms",
                "question": "What pending cases will be withdrawn?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "parties_recitals",
                "heading": "Parties and Dispute Recitals",
                "purpose": "Recite commercial relationship, disputes arisen, and intent to compromise.",
                "required": True,
                "drafting_rules": ["Describe dispute and intent to settle fully."],
            },
            {
                "section_id": "settlement_consideration",
                "heading": "Settlement Amount and Payment Schedule",
                "purpose": "Define settlement amount, tranche dates, and default penalty.",
                "required": True,
                "drafting_rules": ["Specify tranche dates and bank particulars."],
            },
            {
                "section_id": "withdrawal_of_proceedings",
                "heading": "Withdrawal of Pending Litigation",
                "purpose": "Mutual covenants to withdraw pending suits, petitions, and criminal complaints.",
                "required": True,
                "drafting_rules": ["List specific case numbers to be withdrawn."],
            },
            {
                "section_id": "mutual_release",
                "heading": "Full and Final Release of Claims",
                "purpose": "Comprehensive release barring future claims arising from dispute.",
                "required": True,
                "drafting_rules": ["Draft comprehensive full and final release."],
            },
            {
                "section_id": "confidentiality_governing_law",
                "heading": "Confidentiality and Governing Law",
                "purpose": "Confidentiality of terms and Indian law dispute jurisdiction.",
                "required": True,
                "drafting_rules": ["Specify seat of arbitration or court jurisdiction."],
            },
        ],
        "limitations": [
            "Curated drafting template; starting structure requiring lawyer review.",
            "Stamp duty, notarization, and registration requirements vary by state jurisdiction.",
            "Court recording under Section 89 CPC or Order XXIII Rule 3 CPC is required for compromise decrees.",
        ],
    },
    {
        "template_id": "non_disclosure_agreement",
        "name": "Bilateral Non-Disclosure Agreement (NDA)",
        "jurisdiction": "india",
        "document_type": "agreement",
        "version": 1,
        "description": "Standard mutual confidentiality contract protecting proprietary commercial disclosures.",
        "purpose": "Provide a standard bilateral confidentiality and proprietary information protection contract.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "disclosing_party",
                "question": "Who are the participating companies/parties?",
                "evidence_required": True,
            },
            {
                "key": "purpose_description",
                "question": "What is the defined purpose of disclosure?",
                "evidence_required": True,
            },
            {
                "key": "duration_years",
                "question": "What is the duration of confidentiality obligations (e.g. 2 years)?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "definition_confidential_info",
                "heading": "Definition of Confidential Information",
                "purpose": "Define covered trade secrets, financial records, and technical data.",
                "required": True,
                "drafting_rules": ["Define confidential information comprehensively."],
            },
            {
                "section_id": "exclusions",
                "heading": "Standard Carve-Outs and Exclusions",
                "purpose": "Exclude publicly known data, independently developed data, and legal compulsions.",
                "required": True,
                "drafting_rules": ["Include standard four legal exclusions."],
            },
            {
                "section_id": "obligations_and_standard_of_care",
                "heading": "Duty of Confidentiality and Standard of Care",
                "purpose": "Strict need-to-know access restriction and standard of care.",
                "required": True,
                "drafting_rules": ["Enforce reasonable standard of care."],
            },
            {
                "section_id": "remedies_injunction",
                "heading": "Injunctive Relief and Damages",
                "purpose": "Acknowledge monetary damages inadequate and entitlement to interim injunction.",
                "required": True,
                "drafting_rules": ["Acknowledge irreparable harm on breach."],
            },
        ],
        "limitations": [
            "Curated drafting template under the Indian Contract Act, 1872; starting structure requiring lawyer review.",
            "Confidentiality duration, exclusion categories, and injunctive relief clauses must be calibrated to transaction risk.",
            "Stamp duty must be paid according to local state stamp acts.",
        ],
    },
    {
        "template_id": "service_agreement",
        "name": "Master Services Agreement (MSA)",
        "jurisdiction": "india",
        "document_type": "agreement",
        "version": 1,
        "description": "Commercial master service agreement defining deliverables, fee structures, IP assignment, and liability limits.",
        "purpose": "Provide a commercial master service agreement defining deliverables, fee structures, IP assignment, and liability limits.",
        "provenance_note": VIDHIK_PROVENANCE,
        "required_facts": [
            {
                "key": "client_name",
                "question": "Who is the client entity?",
                "evidence_required": True,
            },
            {
                "key": "service_provider_name",
                "question": "Who is the service provider entity?",
                "evidence_required": True,
            },
            {
                "key": "scope_of_services",
                "question": "What is the description of services or SOW reference?",
                "evidence_required": True,
            },
            {
                "key": "fee_structure",
                "question": "What are the payment milestones or hourly rates?",
                "evidence_required": True,
            },
            {
                "key": "term_and_termination",
                "question": "What is the agreement term and termination notice period?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "scope_and_sow",
                "heading": "Scope of Services and Work Orders",
                "purpose": "Framework for services rendered via Statements of Work.",
                "required": True,
                "drafting_rules": ["Govern individual Statements of Work under master terms."],
            },
            {
                "section_id": "fees_and_taxes",
                "heading": "Fee Schedule, Invoicing, and Taxes (GST)",
                "purpose": "Define invoicing cycles, late interest, and GST compliance.",
                "required": True,
                "drafting_rules": ["Specify net 30 payment terms and GST invoicing."],
            },
            {
                "section_id": "ip_rights",
                "heading": "Intellectual Property Ownership and Assignment",
                "purpose": "Work-for-hire assignment of deliverables to client upon payment.",
                "required": True,
                "drafting_rules": ["Include explicit assignment complying with Section 19 Copyright Act."],
            },
            {
                "section_id": "limitation_of_liability",
                "heading": "Limitation of Liability and Indemnity",
                "purpose": "Cap total liability to 12 months' fees and carve out gross negligence.",
                "required": True,
                "drafting_rules": ["Establish reciprocal aggregate liability cap."],
            },
            {
                "section_id": "dispute_resolution",
                "heading": "Governing Law and Arbitration",
                "purpose": "Arbitration clause under Arbitration & Conciliation Act, 1996.",
                "required": True,
                "drafting_rules": ["Specify seat, venue, and language."],
            },
        ],
        "limitations": [
            "Curated drafting template under the Indian Contract Act, 1872; starting structure requiring lawyer review.",
            "IP assignment must comply with Section 19 of the Copyright Act, 1957.",
            "Limitation of liability and indemnification clauses must be evaluated by legal counsel.",
        ],
    },
]


class TemplateRegistryService:
    """
    Curated Indian legal drafting template registry conforming to Section 3 of specs.
    Provides structural guidance for the Writer Agent based on VidhikDastaavej methodology.
    Templates represent drafting blueprints, NOT legal evidence or official court forms.
    """

    def __init__(self) -> None:
        self._templates: dict[str, DraftTemplate] = {
            t["template_id"]: DraftTemplate.model_validate(t) for t in TEMPLATES_RAW
        }

    def list_templates(
        self,
        query: str | None = None,
        document_type: str | None = None,
        jurisdiction: str | None = None,
        limit: int = 5,
    ) -> list[TemplateSummary]:
        """Lists available drafting templates matching search criteria."""
        results: list[TemplateSummary] = []
        q = query.strip().lower() if query else None
        doc_t = document_type.strip().lower() if document_type else None
        jur = jurisdiction.strip().lower() if jurisdiction else None

        for t in self._templates.values():
            if doc_t and t.document_type.lower() != doc_t:
                continue
            if jur and t.jurisdiction.lower() != jur:
                continue
            if q:
                terms = q.split()
                headings = " ".join(s.heading for s in t.sections)
                purposes = " ".join(s.purpose for s in t.sections)
                searchable = f"{t.template_id} {t.name} {t.description} {t.purpose} {t.document_type} {headings} {purposes}".lower()
                if not all(term in searchable for term in terms):
                    continue

            results.append(
                TemplateSummary(
                    template_id=t.template_id,
                    name=t.name,
                    document_type=t.document_type,
                    jurisdiction=t.jurisdiction,
                    description=t.description,
                    purpose=t.purpose,
                    section_count=len(t.sections),
                )
            )
            if len(results) >= limit:
                break

        return results

    def get_template(self, template_id: str) -> DraftTemplate:
        """Retrieves full validated template specification."""
        clean_id = template_id.strip()
        template = self._templates.get(clean_id)
        if template is None:
            raise ValueError(
                f"Template '{template_id}' not found. Available templates: {list(self._templates.keys())}"
            )
        return template

    @property
    def template_ids(self) -> list[str]:
        return list(self._templates.keys())


template_service = TemplateRegistryService()
