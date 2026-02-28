import Link from "next/link";
import { fetchCaseDetail } from "../../../../lib/api";
import { fetchOpinionText } from "../../../../lib/opinions";
import TabBar from "../../../../components/TabBar";
import OpinionReader from "./OpinionReader";

export default async function OpinionPage({
  params,
}: {
  params: Promise<{ term: string; docket: string; opinionId: string }>;
}) {
  const { term, docket, opinionId } = await params;
  const caseData = await fetchCaseDetail(term, docket);

  if (!caseData) {
    return (
      <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4">
        <p className="font-mono text-sm text-error tracking-wider">
          Case not found.
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-3 border border-ink font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
        >
          Return to cases
        </Link>
        <TabBar />
      </div>
    );
  }

  const opinion = caseData.written_opinion?.find(
    (o) => String(o.id) === opinionId
  );

  if (!opinion || !opinion.justia_opinion_url) {
    return (
      <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4">
        <p className="font-mono text-sm text-error tracking-wider">
          Opinion not found.
        </p>
        <Link
          href={`/case/${term}/${docket}`}
          className="mt-6 px-6 py-3 border border-ink font-mono text-xs tracking-wider text-ink active:bg-ink active:text-canvas transition-colors"
        >
          Back to case
        </Link>
        <TabBar />
      </div>
    );
  }

  let opinionText: string;
  try {
    opinionText = await fetchOpinionText(opinion.justia_opinion_url);
  } catch {
    opinionText = "";
  }

  const opinionLabel =
    opinion.type?.label || opinion.title || "Opinion";
  const justiceName = opinion.judge_full_name || "";

  return (
    <OpinionReader
      term={term}
      docket={docket}
      opinionId={opinionId}
      caseName={caseData.name}
      opinionLabel={opinionLabel}
      justiceName={justiceName}
      opinionText={opinionText}
      justiaUrl={opinion.justia_opinion_url}
    />
  );
}
