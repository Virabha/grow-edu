"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

interface StudyRhythmProps {
  data: { day: string; minutes: number }[];
  className?: string;
}

function label(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * Minutes studied per day this week.
 *
 * One series, one hue — so there is no legend and no categorical palette to
 * balance; the heading names what the bars are. Values sit in ink tokens, never
 * in the bar colour, and only the best day is labelled directly so the row does
 * not turn into a wall of numbers.
 */
export function StudyRhythm({ data, className }: StudyRhythmProps) {
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  const peak = Math.max(...data.map((d) => d.minutes), 1);
  const peakIndex = data.findIndex((d) => d.minutes === peak);
  const total = data.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <div className={className}>
      <div
        className="flex h-32 items-stretch gap-[2px]"
        role="img"
        aria-describedby={tableId}
        aria-label={`Study minutes per day this week, ${label(total)} in total`}
      >
        {data.map((entry, index) => {
          const heightPct = Math.max(4, (entry.minutes / peak) * 100);
          const isActive = active === index;
          const isPeak = index === peakIndex;

          return (
            <div
              key={entry.day}
              className="group relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              {(isActive || isPeak) && (
                <span
                  className={cn(
                    "mb-1 text-center text-[10px] font-medium tabular-nums",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label(entry.minutes)}
                </span>
              )}
              <button
                type="button"
                tabIndex={0}
                aria-label={`${entry.day}: ${label(entry.minutes)}`}
                style={{ height: `${heightPct}%` }}
                className={cn(
                  "w-full rounded-t-[4px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isActive
                    ? "bg-[var(--brass)]"
                    : "bg-primary/70 group-hover:bg-[var(--brass)]",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-[2px] border-t border-border/60 pt-1.5">
        {data.map((entry) => (
          <span
            key={entry.day}
            className="flex-1 text-center text-[10px] text-muted-foreground"
          >
            {entry.day}
          </span>
        ))}
      </div>

      {/* Same numbers, reachable without reading the bars. */}
      <table id={tableId} className="sr-only">
        <caption>Study minutes per day this week</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Minutes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.day}>
              <th scope="row">{entry.day}</th>
              <td>{entry.minutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
