import type { RelatedCaseSummary } from "../lib/types";
import CaseListItem from "./CaseListItem";

export default function RelatedCases({
  cases,
}: {
  cases: RelatedCaseSummary[];
}) {
  if (cases.length === 0) return null;

  return (
    <section className="py-4 border-t border-divider">
      <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-3">
        Related Cases
      </h3>
      <div className="divide-y divide-divider -mx-4">
        {cases.map((rc) => (
          <div key={rc.case.id}>
            <div className="px-4 pt-3">
              <span className="inline-block font-mono text-xs tracking-wider text-citation bg-citation/10 px-2 py-0.5">
                {rc.reason}
              </span>
            </div>
            <CaseListItem case={rc.case} />
          </div>
        ))}
      </div>
    </section>
  );
}
