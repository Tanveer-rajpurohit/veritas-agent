from typing import Any

from app.schemas.legal_sources.template import (
    DraftTemplate,
    TemplateSummary,
)

TEMPLATES_RAW: list[dict[str, Any]] = [
    {
        "template_id": "ibc_section_7_working_brief",
        "name": "IBC Section 7 Working Brief",
        "jurisdiction": "india",
        "document_type": "working_brief",
        "version": 1,
        "description": "Working brief for an application by a Financial Creditor under Section 7 of the Insolvency and Bankruptcy Code, 2016.",
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
                "question": "When was the statutory demand notice or loan recall notice issued?",
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
                "purpose": "Summarize the facility disbursed, repayment schedule, and occurrence of default exceeding the threshold.",
                "required": True,
                "drafting_rules": [
                    "Anchor default amount directly in bank records or NeSL certificate."
                ],
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
                "drafting_rules": [
                    "Quote Section 7 provisions using verified statutory citations."
                ],
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
            "Court and NCLT filing requirements must be verified against current IBBI rules.",
            "Template examples do not constitute legal advice or court-approved forms.",
        ],
    },
    {
        "template_id": "legal_notice_payment_demand",
        "name": "Legal Notice for Payment Demand",
        "jurisdiction": "india",
        "document_type": "legal_notice",
        "version": 1,
        "description": "Formal pre-litigation advocate legal notice demanding payment of outstanding dues under contracts or invoices.",
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
                "question": "What is the claimed interest rate per annum?",
                "evidence_required": False,
            },
            {
                "key": "due_date",
                "question": "When did the payment become due?",
                "evidence_required": True,
            },
            {
                "key": "notice_period_days",
                "question": "How many days notice period is provided (e.g. 15 days)?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "heading_and_parties",
                "heading": "Advocate Reference and Party Particulars",
                "purpose": "State counsel details, addressee particulars, and instruction reference.",
                "required": True,
                "drafting_rules": ["State address for service clearly."],
            },
            {
                "section_id": "engagement_background",
                "heading": "Factual Background and Commercial Relationship",
                "purpose": "Set out the underlying agreement, purchase orders, or professional services rendered.",
                "required": True,
                "drafting_rules": ["Reference contract numbers and invoice dates."],
            },
            {
                "section_id": "breach_and_default",
                "heading": "Default in Payment and Breach of Terms",
                "purpose": "Detail non-payment despite delivery and reconciliation of accounts.",
                "required": True,
                "drafting_rules": ["State outstanding amounts in words and figures."],
            },
            {
                "section_id": "demand_and_cure_period",
                "heading": "Formal Demand and Cure Period",
                "purpose": "Formally call upon addressee to pay within statutory/contractual cure days.",
                "required": True,
                "drafting_rules": ["Specify unambiguous deadline and bank payment particulars."],
            },
            {
                "section_id": "reservation_of_rights",
                "heading": "Reservation of Remedies and Legal Action",
                "purpose": "Reserve civil and criminal remedies upon failure to comply.",
                "required": True,
                "drafting_rules": ["Reference appropriate remedies without frivolous threats."],
            },
        ],
        "limitations": [
            "Must be served by registered post with acknowledgment due or speed post.",
        ],
    },
    {
        "template_id": "general_affidavit",
        "name": "General Evidentiary Affidavit",
        "jurisdiction": "india",
        "document_type": "affidavit",
        "version": 1,
        "description": "Standard sworn affidavit for use in civil courts, arbitrations, and statutory tribunals.",
        "required_facts": [
            {
                "key": "deponent_name",
                "question": "What is the full name of the deponent?",
                "evidence_required": True,
            },
            {
                "key": "deponent_age",
                "question": "What is the age of the deponent?",
                "evidence_required": True,
            },
            {
                "key": "deponent_father_name",
                "question": "What is the father's or spouse's name of the deponent?",
                "evidence_required": True,
            },
            {
                "key": "deponent_residence",
                "question": "What is the deponent's permanent or current address?",
                "evidence_required": True,
            },
            {
                "key": "court_or_authority",
                "question": "Before which court or tribunal is this affidavit submitted?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "title_and_cause_title",
                "heading": "Cause Title and Forum Header",
                "purpose": "Identify court and case details.",
                "required": True,
                "drafting_rules": ["Align with court naming conventions."],
            },
            {
                "section_id": "deponent_identification",
                "heading": "Deponent Identification and Competence",
                "purpose": "State deponent particulars and authority to depose.",
                "required": True,
                "drafting_rules": ["State authorization if deposing on behalf of a company."],
            },
            {
                "section_id": "solemn_affirmation",
                "heading": "Solemn Affirmation",
                "purpose": "Solemnly declare oath in accordance with Indian Oaths Act.",
                "required": True,
                "drafting_rules": ["Use statutory affirmation clause."],
            },
            {
                "section_id": "factual_statements",
                "heading": "Statements of Fact within Personal Knowledge",
                "purpose": "Numbered paragraphs of facts known personally or from records.",
                "required": True,
                "drafting_rules": [
                    "Distinguish personal knowledge from information derived from records."
                ],
            },
            {
                "section_id": "verification",
                "heading": "Verification Clause",
                "purpose": "Formal verification clause executed at place and date.",
                "required": True,
                "drafting_rules": [
                    "State which paragraphs are true to knowledge versus derived from records."
                ],
            },
        ],
        "limitations": ["Requires notarization or attestation by an oath commissioner."],
    },
    {
        "template_id": "petition_general",
        "name": "General Original Petition",
        "jurisdiction": "india",
        "document_type": "petition",
        "version": 1,
        "description": "General civil or statutory petition initiating proceedings before a judicial or quasi-judicial body.",
        "required_facts": [
            {
                "key": "petitioner_name",
                "question": "Who is the petitioner?",
                "evidence_required": True,
            },
            {
                "key": "respondent_name",
                "question": "Who is the respondent?",
                "evidence_required": True,
            },
            {
                "key": "forum_name",
                "question": "Which court or authority has jurisdiction?",
                "evidence_required": True,
            },
            {
                "key": "cause_of_action_date",
                "question": "When did the cause of action arise?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "cause_title",
                "heading": "Court and Cause Title",
                "purpose": "Name the forum, parties, and statutory provision under which petition is filed.",
                "required": True,
                "drafting_rules": ["State full addresses and registered details."],
            },
            {
                "section_id": "jurisdiction",
                "heading": "Jurisdictional Averments",
                "purpose": "Establish territorial and pecuniary jurisdiction of the forum.",
                "required": True,
                "drafting_rules": ["Cite relevant jurisdictional section."],
            },
            {
                "section_id": "material_facts",
                "heading": "Material Facts Constituting Cause of Action",
                "purpose": "Chronological statement of essential facts.",
                "required": True,
                "drafting_rules": ["Draft in distinct numbered paragraphs."],
            },
            {
                "section_id": "grounds_of_challenge",
                "heading": "Legal Grounds of Challenge",
                "purpose": "Specific legal and factual grounds entitling petitioner to relief.",
                "required": True,
                "drafting_rules": ["Letter grounds from (A) onwards."],
            },
            {
                "section_id": "interim_relief",
                "heading": "Interim Relief / Stay Application",
                "purpose": "Grounds for preservation of subject matter pending final adjudication.",
                "required": False,
                "drafting_rules": [
                    "Demonstrate prima facie case, balance of convenience, irreparable injury."
                ],
            },
            {
                "section_id": "prayer",
                "heading": "Prayer",
                "purpose": "Unambiguous substantive and interim reliefs sought.",
                "required": True,
                "drafting_rules": ["Draft exact relief clauses clearly."],
            },
        ],
        "limitations": ["Subject to procedural rules of the specific court or tribunal."],
    },
    {
        "template_id": "plaint_civil",
        "name": "Civil Plaint (CPC Order VII)",
        "jurisdiction": "india",
        "document_type": "plaint",
        "version": 1,
        "description": "Standard civil suit plaint compliant with Code of Civil Procedure, 1908 Order VII rules.",
        "required_facts": [
            {
                "key": "plaintiff_name",
                "question": "Who is the plaintiff?",
                "evidence_required": True,
            },
            {
                "key": "defendant_name",
                "question": "Who is the defendant?",
                "evidence_required": True,
            },
            {
                "key": "valuation_amount",
                "question": "What is the valuation of the suit for jurisdiction and court fees?",
                "evidence_required": True,
            },
            {
                "key": "limitation_date",
                "question": "When did the cause of action arise for limitation purposes?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "memo_of_parties",
                "heading": "Memo of Parties",
                "purpose": "Full names, parentage, age, and addresses of all plaintiffs and defendants.",
                "required": True,
                "drafting_rules": ["List all parties with service particulars."],
            },
            {
                "section_id": "jurisdictional_averments",
                "heading": "Pecuniary and Territorial Jurisdiction",
                "purpose": "State why the court has competent jurisdiction under Sections 15-20 of CPC.",
                "required": True,
                "drafting_rules": ["Explain place of cause of action."],
            },
            {
                "section_id": "cause_of_action",
                "heading": "Cause of Action and Limitation",
                "purpose": "Date and event when cause of action first arose and how suit is within limitation.",
                "required": True,
                "drafting_rules": ["Cite relevant article of the Limitation Act, 1963."],
            },
            {
                "section_id": "valuation_and_court_fees",
                "heading": "Suit Valuation and Court Fees",
                "purpose": "Valuation under Court Fees Act and Suits Valuation Act.",
                "required": True,
                "drafting_rules": ["Specify court fee paid on relief."],
            },
            {
                "section_id": "relief_claimed",
                "heading": "Prayer and Relief Claimed",
                "purpose": "Decree sought against defendants.",
                "required": True,
                "drafting_rules": ["State prayers with interest and costs."],
            },
        ],
        "limitations": [
            "Must be accompanied by statement of truth and list of documents under Order VII Rule 14."
        ],
    },
    {
        "template_id": "written_statement",
        "name": "Written Statement (CPC Order VIII)",
        "jurisdiction": "india",
        "document_type": "written_statement",
        "version": 1,
        "description": "Formal defense written statement under Order VIII of Code of Civil Procedure, 1908.",
        "required_facts": [
            {
                "key": "suit_number",
                "question": "What is the suit number and court name?",
                "evidence_required": True,
            },
            {
                "key": "preliminary_objections",
                "question": "What are the preliminary legal objections (e.g. limitation, res judicata)?",
                "evidence_required": False,
            },
        ],
        "sections": [
            {
                "section_id": "preliminary_objections",
                "heading": "Preliminary Objections",
                "purpose": "Maintainability bars, limitation, suppression of material facts, misjoinder.",
                "required": True,
                "drafting_rules": ["State threshold legal bars to the suit."],
            },
            {
                "section_id": "maintainability_bar",
                "heading": "Lack of Cause of Action and Plaint Rejection",
                "purpose": "Averments seeking rejection of plaint under Order VII Rule 11.",
                "required": False,
                "drafting_rules": ["Tie directly to statutory conditions."],
            },
            {
                "section_id": "parawise_reply",
                "heading": "Parawise Reply on Merits",
                "purpose": "Specific traversal and denial of each plaint paragraph.",
                "required": True,
                "drafting_rules": [
                    "Do not make evasive denials; specifically deny each allegation under Order VIII Rule 5."
                ],
            },
            {
                "section_id": "special_defense",
                "heading": "Additional Pleas and Affirmative Defense",
                "purpose": "Special defenses, set-off or counter-claim.",
                "required": False,
                "drafting_rules": ["Pleas must be backed by evidence."],
            },
            {
                "section_id": "prayer",
                "heading": "Prayer for Dismissal",
                "purpose": "Prayer to dismiss the suit with exemplary costs.",
                "required": True,
                "drafting_rules": ["Formulate standard dismissal prayer."],
            },
        ],
        "limitations": ["Must be filed within 30 to 120 days of service of summons."],
    },
    {
        "template_id": "written_submissions",
        "name": "Written Submissions / Notes of Arguments",
        "jurisdiction": "india",
        "document_type": "written_submissions",
        "version": 1,
        "description": "Concise written legal argument submitted at final hearing before High Courts or Tribunals.",
        "required_facts": [
            {
                "key": "case_number",
                "question": "What is the case or appeal number?",
                "evidence_required": True,
            },
            {
                "key": "forum_name",
                "question": "Which court or bench is hearing the matter?",
                "evidence_required": True,
            },
            {
                "key": "arguing_party",
                "question": "On whose behalf are submissions filed?",
                "evidence_required": True,
            },
            {
                "key": "key_issues",
                "question": "What are the core questions of law framed?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "brief_background",
                "heading": "Brief Factual Background",
                "purpose": "Crisp one-page factual context leading to the present controversy.",
                "required": True,
                "drafting_rules": ["Focus strictly on uncontroverted facts."],
            },
            {
                "section_id": "questions_arising",
                "heading": "Issues and Questions Arising for Determination",
                "purpose": "Framing the essential legal propositions.",
                "required": True,
                "drafting_rules": ["Number issues distinctly."],
            },
            {
                "section_id": "propositions_of_law",
                "heading": "Submissions on Behalf of the Party",
                "purpose": "Detailed legal propositions supported by statutory interpretations and precedents.",
                "required": True,
                "drafting_rules": ["Extract only the relevant ratio decidendi of cited cases."],
            },
            {
                "section_id": "evidentiary_analysis",
                "heading": "Appreciation of Evidence and Record Citations",
                "purpose": "Tabular or chronological linkage of evidence to claims.",
                "required": True,
                "drafting_rules": ["Reference exact page and paragraph numbers of paper book."],
            },
            {
                "section_id": "conclusion",
                "heading": "Conclusion and Summary of Reliefs",
                "purpose": "Final prayer for the specific order or decree sought.",
                "required": True,
                "drafting_rules": ["Keep summary crisp and decisive."],
            },
        ],
        "limitations": ["Advocate must highlight binding High Court and Supreme Court precedents."],
    },
    {
        "template_id": "reply_counter_affidavit",
        "name": "Reply / Counter Affidavit",
        "jurisdiction": "india",
        "document_type": "reply",
        "version": 1,
        "description": "Form of response and counter-affidavit filed in opposition to miscellaneous applications or writ petitions.",
        "required_facts": [
            {
                "key": "proceedings_title",
                "question": "What is the main petition title and number?",
                "evidence_required": True,
            },
            {
                "key": "deponent_capacity",
                "question": "In what capacity is deponent replying?",
                "evidence_required": True,
            },
            {
                "key": "application_being_countered",
                "question": "Which application or petition is being opposed?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "preliminary_submissions",
                "heading": "Preliminary Submissions and Maintainability",
                "purpose": "Threshold objections regarding clean hands, laches, alternate remedy.",
                "required": True,
                "drafting_rules": ["State preliminary objections before merits."],
            },
            {
                "section_id": "response_to_interim_prayer",
                "heading": "Response to Interim Relief",
                "purpose": "Demonstrating why no ad-interim relief is warranted.",
                "required": False,
                "drafting_rules": ["Highlight prejudice if interim order granted."],
            },
            {
                "section_id": "factual_clarifications",
                "heading": "Factual Clarifications and True State of Affairs",
                "purpose": "Exposing suppressed or misstated facts in the application.",
                "required": True,
                "drafting_rules": ["Cite contemporaneous documentary evidence."],
            },
            {
                "section_id": "prayer_for_dismissal",
                "heading": "Prayer for Dismissal with Costs",
                "purpose": "Prayer to vacate interim orders and dismiss petition.",
                "required": True,
                "drafting_rules": ["Seek dismissal with exemplary costs."],
            },
        ],
        "limitations": ["Must be sworn before a recognized oath commissioner."],
    },
    {
        "template_id": "rejoinder",
        "name": "Rejoinder Affidavit",
        "jurisdiction": "india",
        "document_type": "rejoinder",
        "version": 1,
        "description": "Rebuttal affidavit filed by petitioner/applicant responding to the counter-affidavit of respondent.",
        "required_facts": [
            {
                "key": "reference_reply_date",
                "question": "When was the counter affidavit served?",
                "evidence_required": True,
            },
            {
                "key": "specific_new_allegations_denied",
                "question": "What new false allegations require specific denial?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "preliminary_rebuttal",
                "heading": "Preliminary Rebuttal",
                "purpose": "Reiterate maintainability and expose evasion in the counter affidavit.",
                "required": True,
                "drafting_rules": ["Refrain from mere repetition of the original petition."],
            },
            {
                "section_id": "denial_of_untrue_averments",
                "heading": "Specific Denial of False Averments",
                "purpose": "Rebut newly introduced defenses with documented proof.",
                "required": True,
                "drafting_rules": ["Address each false plea directly."],
            },
            {
                "section_id": "reassertion_of_petition_grounds",
                "heading": "Reassertion of Entitlement to Relief",
                "purpose": "Reinforce core prayer in light of admissions in the reply.",
                "required": True,
                "drafting_rules": [
                    "Highlight any judicial or evidentiary admissions made by respondent."
                ],
            },
            {
                "section_id": "prayer",
                "heading": "Prayer",
                "purpose": "Reiterate original prayer for judgment.",
                "required": True,
                "drafting_rules": ["Confirm prayers remain intact."],
            },
        ],
        "limitations": ["Rejoinder cannot introduce an entirely new cause of action."],
    },
    {
        "template_id": "interlocutory_application",
        "name": "Interlocutory Application (IA)",
        "jurisdiction": "india",
        "document_type": "application",
        "version": 1,
        "description": "Interim miscellaneous application seeking directions, stay, or amendment in pending proceedings.",
        "required_facts": [
            {
                "key": "main_case_number",
                "question": "What is the primary case number?",
                "evidence_required": True,
            },
            {
                "key": "urgency_reason",
                "question": "Why is urgent interim intervention required?",
                "evidence_required": True,
            },
            {
                "key": "specific_directions_sought",
                "question": "What specific directions or interim orders are sought?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "cause_title",
                "heading": "Cause Title and Relevant Rule",
                "purpose": "Specify court, main case number, and procedural provision.",
                "required": True,
                "drafting_rules": ["Include IA number placeholder."],
            },
            {
                "section_id": "necessity_and_urgency",
                "heading": "Necessity and Urgent Circumstances",
                "purpose": "Explain why relief cannot await final disposal of the case.",
                "required": True,
                "drafting_rules": ["State immediate threat or prejudice."],
            },
            {
                "section_id": "supporting_factual_matrix",
                "heading": "Factual Matrix Supporting Interim Direction",
                "purpose": "Material facts emerging during pendency of proceedings.",
                "required": True,
                "drafting_rules": ["Confine to facts relevant to the interlocutory prayer."],
            },
            {
                "section_id": "grounds_for_interim_order",
                "heading": "Grounds for Interim Relief",
                "purpose": "Prima facie case, irreparable harm, balance of convenience.",
                "required": True,
                "drafting_rules": [
                    "Grounds must align with standard interim relief tripartite test."
                ],
            },
            {
                "section_id": "prayer",
                "heading": "Prayer for Interim Orders",
                "purpose": "Explicit directions sought from the court.",
                "required": True,
                "drafting_rules": ["Seek precise, executable directions."],
            },
        ],
        "limitations": ["Must be supported by a separate verification affidavit."],
    },
    {
        "template_id": "memorandum_of_appeal",
        "name": "Memorandum of Appeal (Civil / Commercial)",
        "jurisdiction": "india",
        "document_type": "appeal",
        "version": 1,
        "description": "Memorandum of appeal under CPC Section 96 or Commercial Courts Act Section 13.",
        "required_facts": [
            {
                "key": "impugned_order_date",
                "question": "What is the date of the impugned judgment or order?",
                "evidence_required": True,
            },
            {
                "key": "impugned_order_court",
                "question": "Which trial court or tribunal passed the impugned order?",
                "evidence_required": True,
            },
            {
                "key": "limitation_period",
                "question": "Is the appeal filed within the statutory limitation period?",
                "evidence_required": True,
            },
            {
                "key": "appellant_name",
                "question": "Who is the appellant?",
                "evidence_required": True,
            },
            {
                "key": "respondent_name",
                "question": "Who is the respondent?",
                "evidence_required": True,
            },
        ],
        "sections": [
            {
                "section_id": "impugned_order_particulars",
                "heading": "Particulars of the Impugned Judgment and Decree",
                "purpose": "Court details, suit number, date of decree, and judge.",
                "required": True,
                "drafting_rules": ["State certified copy application and receipt dates."],
            },
            {
                "section_id": "dates_and_events",
                "heading": "Synopsis and Chronology of Events",
                "purpose": "Brief chronological overview of trial court proceedings.",
                "required": True,
                "drafting_rules": ["Highlight evidence disregarded by trial judge."],
            },
            {
                "section_id": "errors_of_law_and_fact",
                "heading": "Perversity and Errors in the Impugned Order",
                "purpose": "Identify misdirection in law and misreading of oral/documentary evidence.",
                "required": True,
                "drafting_rules": ["Specify finding numbers from judgment."],
            },
            {
                "section_id": "grounds_of_appeal",
                "heading": "Grounds of Appeal",
                "purpose": "Enumerated grounds demonstrating why judgment must be set aside.",
                "required": True,
                "drafting_rules": ["Letter each ground separately."],
            },
            {
                "section_id": "relief_sought",
                "heading": "Relief Sought in Appeal",
                "purpose": "Setting aside of impugned decree and granting costs.",
                "required": True,
                "drafting_rules": ["Formulate appellate prayer clearly."],
            },
        ],
        "limitations": ["Certified copy of judgment and decree must be attached."],
    },
    {
        "template_id": "arbitration_notice",
        "name": "Notice Invoking Arbitration (Section 21)",
        "jurisdiction": "india",
        "document_type": "arbitration_notice",
        "version": 1,
        "description": "Statutory notice invoking arbitration under Section 21 of the Arbitration and Conciliation Act, 1996.",
        "required_facts": [
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
                "section_id": "party_references",
                "heading": "Parties and Contract Reference",
                "purpose": "Identify contract parties and commercial engagement.",
                "required": True,
                "drafting_rules": ["State registered corporate addresses."],
            },
            {
                "section_id": "contract_and_arbitration_clause",
                "heading": "The Underlying Agreement and Arbitration Clause",
                "purpose": "Reproduce verbatim the dispute resolution and arbitration clause.",
                "required": True,
                "drafting_rules": ["Quote clause verbatim including seat and venue."],
            },
            {
                "section_id": "nature_of_disputes",
                "heading": "Nature of Disputes and Monetized Claims",
                "purpose": "Detail breach of contract and amounts due.",
                "required": True,
                "drafting_rules": ["State claims provisionally subject to statement of claim."],
            },
            {
                "section_id": "invocation_and_nomination",
                "heading": "Invocation of Arbitration and Arbitrator Proposal",
                "purpose": "Expressly trigger commencement under Section 21 and nominate arbitrator.",
                "required": True,
                "drafting_rules": ["Propose independent candidate under Seventh Schedule."],
            },
            {
                "section_id": "demand_for_concurrence",
                "heading": "Demand for Concurrence within 30 Days",
                "purpose": "Provide statutory 30 days under Section 11 before approaching High Court.",
                "required": True,
                "drafting_rules": ["Specify 30-day timeline under Section 11(6)."],
            },
        ],
        "limitations": [
            "Arbitral proceedings commence on date of receipt of notice under Section 21."
        ],
    },
    {
        "template_id": "settlement_agreement",
        "name": "Mutual Settlement Agreement",
        "jurisdiction": "india",
        "document_type": "agreement",
        "version": 1,
        "description": "Comprehensive commercial settlement agreement releasing claims and withdrawing pending litigation.",
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
                "section_id": "recitals",
                "heading": "Recitals and Background Disputes",
                "purpose": "Record commercial relationship, disputes, and mutual desire to settle.",
                "required": True,
                "drafting_rules": ["Reference pending case numbers."],
            },
            {
                "section_id": "settlement_terms_and_payment_schedule",
                "heading": "Settlement Amount and Payment Mechanism",
                "purpose": "Detail total settlement sum, tranches, and bank accounts.",
                "required": True,
                "drafting_rules": ["State default consequences on missed tranche."],
            },
            {
                "section_id": "mutual_releases_and_discharge",
                "heading": "Full and Final Release and Discharge",
                "purpose": "Irrevocably discharge all present and past claims.",
                "required": True,
                "drafting_rules": ["Draft comprehensive mutual release."],
            },
            {
                "section_id": "withdrawal_of_proceedings",
                "heading": "Withdrawal and Quashing of Proceedings",
                "purpose": "Commitment to file joint memos or withdrawal applications.",
                "required": True,
                "drafting_rules": ["Specify timeline for withdrawal steps."],
            },
            {
                "section_id": "confidentiality_and_governing_law",
                "heading": "Confidentiality, Governing Law, and Jurisdiction",
                "purpose": "Confidentiality covenants and Indian dispute seat.",
                "required": True,
                "drafting_rules": ["Specify governing law as laws of India."],
            },
        ],
        "limitations": [
            "Stamp duty and registration requirements must be checked by jurisdiction."
        ],
    },
    {
        "template_id": "non_disclosure_agreement",
        "name": "Mutual Non-Disclosure Agreement (NDA)",
        "jurisdiction": "india",
        "document_type": "agreement",
        "version": 1,
        "description": "Standard bilateral non-disclosure agreement for commercial and technology collaborations.",
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
                "section_id": "definitions_of_confidential_info",
                "heading": "Definition of Confidential Information",
                "purpose": "Define scope of technical, financial, and proprietary information.",
                "required": True,
                "drafting_rules": ["Include marking and oral disclosure confirmation provisions."],
            },
            {
                "section_id": "obligations_and_permitted_use",
                "heading": "Non-Disclosure Obligations and Standard of Care",
                "purpose": "Reasonable degree of care and strict limitation to defined Purpose.",
                "required": True,
                "drafting_rules": ["Limit disclosure to employees on need-to-know basis."],
            },
            {
                "section_id": "exceptions_to_confidentiality",
                "heading": "Standard Exclusions from Confidentiality",
                "purpose": "Information in public domain, prior knowledge, independently developed.",
                "required": True,
                "drafting_rules": ["Include court order / legally compelled disclosure carve-out."],
            },
            {
                "section_id": "term_and_return_of_materials",
                "heading": "Term, Termination, and Return of Materials",
                "purpose": "Duration of agreement and prompt return/destruction of confidential records.",
                "required": True,
                "drafting_rules": ["Survival clause for confidentiality period."],
            },
            {
                "section_id": "remedies_and_dispute_resolution",
                "heading": "Injunctive Relief and Dispute Resolution",
                "purpose": "Right to seek injunction in court and governing law.",
                "required": True,
                "drafting_rules": ["Acknowledge damages are inadequate remedy."],
            },
        ],
        "limitations": ["Must be properly executed on appropriate state non-judicial stamp paper."],
    },
    {
        "template_id": "service_agreement",
        "name": "Master Professional Services Agreement",
        "jurisdiction": "india",
        "document_type": "agreement",
        "version": 1,
        "description": "Standard B2B professional services contract covering deliverables, IP, warranties, and liability caps.",
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
                "section_id": "appointment_and_scope",
                "heading": "Engagement, Appointment, and Statements of Work",
                "purpose": "Mechanism for executing Statements of Work under master terms.",
                "required": True,
                "drafting_rules": ["Define relationship as independent contractor."],
            },
            {
                "section_id": "fees_and_invoicing",
                "heading": "Fees, Invoicing, and GST Compliance",
                "purpose": "Payment schedule, tax deduction at source (TDS), and GST invoice terms.",
                "required": True,
                "drafting_rules": ["Include GST compliance and interest on delayed payments."],
            },
            {
                "section_id": "intellectual_property",
                "heading": "Intellectual Property Rights and Work-for-Hire",
                "purpose": "Allocation of pre-existing IP and assignment of project deliverables.",
                "required": True,
                "drafting_rules": ["Include explicit copyright assignment clause."],
            },
            {
                "section_id": "representations_and_warranties",
                "heading": "Representations, Warranties, and Limitation of Liability",
                "purpose": "Standards of service and mutual limitation of liability cap.",
                "required": True,
                "drafting_rules": ["Cap aggregate liability at fees paid."],
            },
            {
                "section_id": "term_and_termination_procedure",
                "heading": "Term, Termination for Cause, and Consequences",
                "purpose": "Termination for material breach and transition assistance.",
                "required": True,
                "drafting_rules": ["Specify 30-day cure period for breach."],
            },
        ],
        "limitations": ["Stamp duty varies across Indian states depending on consideration."],
    },
]


class TemplateRegistryService:
    """
    Curated in-memory registry of Indian legal drafting templates.
    Influenced by VidhikDastaavej section-planning concepts.
    Templates govern structure and style; they are never evidence.
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
        """Returns compact summaries of matching templates."""
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
                searchable = f"{t.template_id} {t.name} {t.description} {t.document_type} {headings} {purposes}".lower()
                if not all(term in searchable for term in terms):
                    continue

            results.append(
                TemplateSummary(
                    template_id=t.template_id,
                    name=t.name,
                    document_type=t.document_type,
                    jurisdiction=t.jurisdiction,
                    description=t.description,
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
