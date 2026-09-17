"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "What is Veritas and who is it built for?",
    answer:
      "Veritas is an evidence-grounded drafting and verification workspace built specifically for Indian advocates, independent counsel, and litigation practices. It helps legal teams spot factual contradictions across banking ledgers and loan agreements, verify Supreme Court and High Court citations, and export court-ready briefs with ironclad proof.",
  },
  {
    question: "How does the 4-axis citation verification work?",
    answer:
      "Veritas tests citations across four rigorous standards: (1) Precedent Existence — verifying the case exists on official court dockets; (2) Verbatim Quote Fidelity — matching quoted passages character-for-character; (3) Proposition Support — testing whether the ruling actually supports your legal proposition; and (4) Good-Law Validity — ensuring the ruling has not been overruled or distinguished.",
  },
  {
    question: "What happens when I edit a verified paragraph?",
    answer:
      "To safeguard courtroom credibility, any edit to an approved sentence immediately triggers an automatic reset of that verification mark. You will never risk filing an altered draft whose earlier approval was invalidated by subsequent revisions.",
  },
  {
    question: "Is client confidential data used to train public AI models?",
    answer:
      "Never. Your matter documents, client agreements, demand notices, and strategy notes remain strictly isolated to your private workspace. Veritas never shares, sells, or uses your matter records to train external AI models.",
  },
  {
    question: "Can Veritas export court-ready briefs with citation annexures?",
    answer:
      "Yes. Once all flagged factual discrepancies have been settled and citations approved, Veritas exports court-formatted draft PDFs with page-anchored citation annexures ready for senior advocate review and filing.",
  },
];

export function FAQSection() {
  const [openFAQItems, setOpenFAQItems] = useState<number[]>([0]);

  const toggleFAQItem = (index: number) => {
    setOpenFAQItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <section id="faq" className="w-full border-b border-stone-200 bg-white">
      <div className="w-full max-w-6xl lg:max-w-7xl mx-auto border-x border-stone-200 px-6 sm:px-10 lg:px-12 py-16 sm:py-24 flex flex-col lg:flex-row gap-10 lg:gap-16">
        <div className="w-full lg:w-1/3 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700 w-fit">
            <span>FAQ</span>
          </div>
          <h2 className="text-stone-900 font-bold text-2xl sm:text-3xl md:text-4xl font-sans tracking-tight leading-[1.12] text-balance">
            Frequently asked questions
          </h2>
          <p className="text-stone-600 text-sm sm:text-base font-sans leading-relaxed">
            How Veritas protects courtroom credibility, prevents fabricated citations, and prepares court-ready briefs.
          </p>
        </div>

        <div className="w-full lg:w-2/3 flex flex-col">
          {FAQ_DATA.map((item, index) => {
            const isOpen = openFAQItems.includes(index);

            return (
              <div
                key={index}
                className="w-full border-b border-stone-200/90 last:border-b-0 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQItem(index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  className="w-full rounded-sm py-5 flex justify-between items-center gap-4 text-left hover:text-[#487aa8] transition-colors cursor-pointer"
                >
                  <span className="flex-1 text-stone-900 text-base font-semibold font-sans">
                    {item.question}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={`text-stone-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : "rotate-0"
                    }`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100 pb-5"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-stone-600 text-sm font-sans leading-relaxed max-w-prose">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
