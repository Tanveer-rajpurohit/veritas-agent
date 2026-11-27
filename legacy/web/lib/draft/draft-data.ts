import type { DraftDocument } from "../../types/draft/types";

export const SEED_DRAFT_DOC: DraftDocument = {
  id: "draft-ibc-sec7",
  title: "IBC Section 7 Application (Form 1)",
  type: "draft",
  matterName: "Arora v. Meridian Estates Pvt. Ltd.",
  court: "National Company Law Tribunal, Principal Bench, New Delhi",
  caseNumber: "ARB.P. 428/2026",
  currentVersion: "v3",
  versions: [
    {
      version: "v3",
      label: "v3 (Verified Precedents & Ledger Audit)",
      date: "Today, 18:42",
      summary:
        "Full quotation parity verified; Annexure B-4 default date anchored.",
      pages: [
        {
          pageNumber: 1,
          totalPdfPages: 2,
          headerTitle: "NCLT PRINCIPAL BENCH, NEW DELHI · CP NO. 428/2026",
          subHeader:
            "BEFORE THE NATIONAL COMPANY LAW TRIBUNAL\nPRINCIPAL BENCH, NEW DELHI\nCOMPANY PETITION NO. ______ / 2026\nIN THE MATTER OF SECTION 7 OF THE INSOLVENCY AND BANKRUPTCY CODE, 2016",
          sections: [
            {
              id: "sec-part-1",
              title: "PART I: PARTICULARS OF THE APPLICANT (FINANCIAL CREDITOR)",
              content:
                "1. Name of Financial Creditor: R.K. Arora\n2. Address for correspondence: Barakhamba Road, Connaught Place, New Delhi - 110001\n3. Identification: Permanent Account Number AABCR1234D\n4. Authorized Representative: Adv. Tanveer Singh, Chambers of Veritas Legal, Supreme Court of India.",
            },
            {
              id: "sec-part-2",
              title: "PART II: PARTICULARS OF THE CORPORATE DEBTOR",
              content:
                "1. Name: Meridian Estates Pvt. Ltd.\n2. Identification No.: U45201DL2012PTC239841\n3. Registered Office: 14, Barakhamba Road, Connaught Place, New Delhi 110001\n4. Nominal Share Capital: ₹50,00,00,000/- (Rupees Fifty Crores Only)\n5. Paid-up Share Capital: ₹38,50,00,000/- (Rupees Thirty-Eight Crores Fifty Lakhs Only).",
            },
            {
              id: "sec-part-3",
              title:
                "PART III: PARTICULARS OF PROPOSED INTERIM RESOLUTION PROFESSIONAL",
              content:
                "1. Name of Proposed IRP: Mr. Suresh Chandra Verma\n2. Registration Number: IBBI/IPA-001/IP-P00892/2018-2019/11492\n3. Office Address: 804, World Trade Centre, Babar Road, New Delhi 110001.\n4. Written Consent: Duly executed Form 2 under Regulation 4(2) of IBBI Regulations, 2016 annexed as Annexure A-1.",
            },
          ],
        },
        {
          pageNumber: 2,
          totalPdfPages: 2,
          headerTitle: "PART IV & V · ARORA V. MERIDIAN ESTATES PVT. LTD.",
          sections: [
            {
              id: "sec-part-4",
              title:
                "PART IV: PARTICULARS OF FINANCIAL DEBT AND DEFAULT COMPUTATION",
              content:
                "1. Total Amount Granted: ₹42,80,00,000/- under Senior Secured Facility Agreement dated 12.01.2019.\n2. Amount in Default: ₹42,80,00,000/- Principal plus ₹6,42,00,000/- Penal Interest at 14.50% p.a.\n3. Default Date: 14th August 2021 (Failure to honor Tranche-II amortization milestone).\n4. Limitation Defense (Article 137): Corporate Debtor recognized liability in signed Audited Financial Statements for FY 2021-22 and FY 2022-23 (Annexure B-4), creating fresh period of limitation under Section 18 of Limitation Act, 1963.",
              citations: [
                {
                  title: "Innoventive Industries Ltd. v. ICICI Bank",
                  citation: "(2018) 1 SCC 407",
                  status: "Supported",
                  court: "Supreme Court of India",
                },
                {
                  title:
                    "Asset Reconstruction Company (India) Ltd. v. Bishal Jaiswal",
                  citation: "(2021) 6 SCC 366",
                  status: "Supported",
                  court: "Supreme Court of India",
                },
              ],
            },
            {
              id: "sec-part-5",
              title: "PART V: RELIEFS SOUGHT",
              content:
                "In light of the substantiated debt and default documented herein, the Financial Creditor respectfully prays that this Hon'ble Tribunal may be pleased to:\n\n(a) ADMIT the present Company Petition under Section 7(5)(a) of the Insolvency and Bankruptcy Code, 2016;\n(b) INITIATE Corporate Insolvency Resolution Process (CIRP) in respect of Meridian Estates Pvt. Ltd.;\n(c) DECLARE a moratorium in terms of Section 14 of the Code;\n(d) APPOINT Mr. Suresh Chandra Verma as Interim Resolution Professional (IRP).",
            },
          ],
        },
      ],
    },
    {
      version: "v2",
      label: "v2 (Limitation Section 18 Anchored)",
      date: "Yesterday, 14:10",
      summary:
        "Added Bishal Jaiswal citation for balance sheet debt acknowledgment.",
      pages: [
        {
          pageNumber: 1,
          totalPdfPages: 1,
          headerTitle: "NCLT NEW DELHI · SECTION 7 PETITION",
          sections: [
            {
              id: "sec-v2-1",
              title: "PART IV: FINANCIAL DEBT COMPUTATION",
              content:
                "Amount in default: ₹42,80,00,000/-. Default date: 14-Aug-2021. Section 18 limitation defense anchored through balance sheet acknowledgment.",
            },
          ],
        },
      ],
    },
    {
      version: "v1",
      label: "v1 (Initial Filing Draft)",
      date: "14 Sep 2026",
      summary: "Initial petition skeleton generated from loan agreement.",
      pages: [
        {
          pageNumber: 1,
          totalPdfPages: 1,
          headerTitle: "NCLT NEW DELHI · SECTION 7 PETITION",
          sections: [
            {
              id: "sec-v1-1",
              title: "PART I: SKELETON",
              content:
                "Initial petition skeleton without balance sheet acknowledgment citations.",
            },
          ],
        },
      ],
    },
  ],
};

export function getDraftById(id: string): DraftDocument {
  return {
    ...SEED_DRAFT_DOC,
    id: id || SEED_DRAFT_DOC.id,
  };
}

export function draftToTipTapHtml(doc: DraftDocument, version?: string): string {
  const activeVersion =
    doc.versions.find((v) => v.version === (version || doc.currentVersion)) ||
    doc.versions[0];

  if (activeVersion?.contentHtml) {
    return activeVersion.contentHtml;
  }

  if (doc.contentHtml) {
    return doc.contentHtml;
  }

  const pages = activeVersion?.pages || [];
  if (pages.length === 0) {
    return "<p>Start drafting your legal document...</p>";
  }

  const htmlParts: string[] = [];

  // Top Title & Subheaders
  const firstPage = pages[0];
  if (firstPage?.subHeader) {
    const lines = firstPage.subHeader.split("\n").filter(Boolean);
    for (const line of lines) {
      if (line.includes("BEFORE") || line.includes("PRINCIPAL BENCH")) {
        htmlParts.push(
          `<p style="text-align: center; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px;">${line}</p>`,
        );
      } else if (line.includes("COMPANY PETITION")) {
        htmlParts.push(
          `<p style="text-align: center; font-weight: 700; margin-bottom: 4px;">${line}</p>`,
        );
      } else {
        htmlParts.push(
          `<p style="text-align: center; font-style: italic; margin-bottom: 18px;">${line}</p>`,
        );
      }
    }
  }

  for (const page of pages) {
    for (const section of page.sections) {
      htmlParts.push(`<h2>${section.title}</h2>`);

      const contentLines = section.content.split("\n").filter(Boolean);
      const isNumbered = contentLines.every((l) => /^\d+\.\s/.test(l));

      if (isNumbered) {
        htmlParts.push("<ol>");
        for (const line of contentLines) {
          const cleanLine = line.replace(/^\d+\.\s*/, "");
          const colonIndex = cleanLine.indexOf(":");
          if (colonIndex > 0 && colonIndex < 35) {
            const label = cleanLine.slice(0, colonIndex + 1);
            const val = cleanLine.slice(colonIndex + 1);
            htmlParts.push(`<li><strong>${label}</strong>${val}</li>`);
          } else {
            htmlParts.push(`<li>${cleanLine}</li>`);
          }
        }
        htmlParts.push("</ol>");
      } else {
        for (const line of contentLines) {
          htmlParts.push(`<p>${line}</p>`);
        }
      }

      if (section.citations && section.citations.length > 0) {
        htmlParts.push('<p style="margin-top: 14px; margin-bottom: 4px;"><strong>Precedents Relied Upon:</strong></p>');
        for (const cit of section.citations) {
          const url =
            (cit as unknown as { url?: string }).url ||
            `https://indiankanoon.org/search/?formInput=${encodeURIComponent(cit.title + " " + cit.citation)}`;
          htmlParts.push(
            `<p style="margin-bottom: 6px;"><span class="inline-citation cursor-pointer" data-citation-title="${cit.title}" data-citation="${cit.citation}" data-court="${cit.court}" data-citation-link="${url}"><u class="underline decoration-[#487aa8] underline-offset-[3px] font-medium text-[#2c5478]">${cit.title}</u>; ${cit.citation}</span></p>`,
          );
        }
      }
    }
  }

  return htmlParts.join("\n");
}

