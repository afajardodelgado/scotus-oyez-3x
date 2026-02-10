import type { OyezTimeline } from "../lib/types";
import { formatTimestamp } from "../lib/utils";

interface TimelineEvent {
  label: string;
  date: string | null;
  reached: boolean;
  active: boolean;
}

function deriveEvents(timeline: OyezTimeline[]): TimelineEvent[] {
  const find = (event: string): string | null => {
    const entry = timeline.find((t) => t.event === event);
    if (!entry || !entry.dates || entry.dates.length === 0) return null;
    return formatTimestamp(entry.dates[0]);
  };

  const grantedDate = find("Granted");
  const arguedDate = find("Reargued") || find("Argued");
  const decidedDate = find("Decided");

  const hasGranted = !!grantedDate;
  const hasArgued = !!arguedDate;
  const hasDecided = !!decidedDate;

  return [
    {
      label: "Granted",
      date: grantedDate,
      reached: true,
      active: !hasArgued && !hasDecided,
    },
    {
      label: "Argued",
      date: arguedDate,
      reached: hasArgued,
      active: hasArgued && !hasDecided,
    },
    {
      label: "Decided",
      date: decidedDate,
      reached: hasDecided,
      active: hasDecided,
    },
  ];
}

export default function CaseTimeline({
  timeline,
}: {
  timeline: OyezTimeline[];
}) {
  if (!timeline || timeline.length === 0) return null;

  const events = deriveEvents(timeline);

  return (
    <section className="py-4 border-t border-divider">
      <h3 className="font-mono text-xs text-fade tracking-widest uppercase mb-4">
        Case Progress
      </h3>
      <div className="flex items-start">
        {events.map((ev, i) => (
          <div key={ev.label} className="flex items-start flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 border ${
                  ev.reached
                    ? ev.label === "Decided"
                      ? "border-success bg-success"
                      : ev.label === "Argued"
                        ? "border-citation bg-citation"
                        : "border-fade/60 bg-fade/60"
                    : "border-fade/30 bg-transparent"
                }`}
              />
              <div className="mt-1.5">
                <span
                  className={`font-mono text-xs tracking-wider ${
                    ev.active ? "text-ink" : ev.reached ? "text-fade" : "text-fade/40"
                  }`}
                >
                  {ev.label}
                </span>
              </div>
              {ev.date && (
                <span className="font-mono text-xs text-fade/60 tracking-wider mt-0.5">
                  {ev.date}
                </span>
              )}
              {!ev.reached && (
                <span className="font-mono text-xs text-fade/30 tracking-wider mt-0.5">
                  Pending
                </span>
              )}
            </div>
            {i < events.length - 1 && (
              <div className="flex-1 mt-1.5 mx-1">
                <div
                  className={`h-px ${
                    events[i + 1].reached ? "bg-fade/40" : "bg-fade/15"
                  }`}
                  style={{ borderTop: events[i + 1].reached ? undefined : "1px dashed rgba(136,136,136,0.25)" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
