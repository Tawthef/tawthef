import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Is Tawthef free for candidates?",
    answer: "Yes. Candidates create profiles, apply to jobs, and track their application status at no cost. Recruiter and employer subscriptions fund the platform.",
  },
  {
    question: "How are recruiters verified?",
    answer: "Every recruiter uploads company documents during registration and is manually reviewed by our team before they can post jobs or search candidates. This keeps the platform free of fake listings and spam.",
  },
  {
    question: "What is two-level shortlisting?",
    answer: "Every job on Tawthef goes through two rounds of screening before a candidate reaches the final decision stage. In agency-led hiring, the agency vets first and then the employer reviews. In direct hiring, HR screens first and then the technical team evaluates. This removes bias and ensures only qualified candidates advance.",
  },
  {
    question: "Can recruitment agencies use Tawthef?",
    answer: "Yes. Agencies get their own private workspace, can manage candidates across multiple client jobs, and submit shortlists directly to employers on the platform. Employers only see the candidates the agency chooses to submit.",
  },
  {
    question: "How does the Resume Search subscription work?",
    answer: "For $500 per 30 days, recruiters unlock full candidate profiles, CVs, and contact details from our searchable talent database. Without a subscription you can still search and see skills and experience — names and contact details stay hidden until you subscribe.",
  },
];

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-16 lg:py-24 gradient-section relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-headline text-foreground mb-4">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="text-subhead">
            Everything you need to know before getting started.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="text-sm font-semibold text-foreground">{faq.question}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
