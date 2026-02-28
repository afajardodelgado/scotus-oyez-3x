"use client";

import AnnotatableText from "../../components/AnnotatableText";
import type { ConstitutionSection } from "../../lib/api";

interface ConstitutionContentProps {
  sections: ConstitutionSection[];
  article: string;
}

export default function ConstitutionContent({
  sections,
  article,
}: ConstitutionContentProps) {
  return (
    <>
      {sections.map((s) => {
        const documentId = `constitution-${article}${s.section_number ? `-${s.section_number}` : ""}`;

        return (
          <section key={s.id} className="py-4 border-t border-divider">
            {s.section_number && (
              <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
                Section {s.section_number}
                {s.section_title && ` — ${s.section_title}`}
              </h3>
            )}
            <AnnotatableText
              documentId={documentId}
              text={s.text}
            />
          </section>
        );
      })}
    </>
  );
}
