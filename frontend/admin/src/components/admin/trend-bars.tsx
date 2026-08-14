"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

interface TrendBarsProps {
  data: { month: string; value: number }[];
  format: (value: number) => string;
  label: string;
  className?: string;
}

/**
 * A single-series monthly bar chart.
 *
 * One series in one hue, so there is no legend and no categorical palette to
 * balance — the card heading names what the bars are. Values sit in ink tokens
 * rather than the bar colour, and only the peak is labelled directly.
 */
export function TrendBars({ data, format, label, className }: TrendBarsProps) {
  const [active, setActive] = useState<number | null>(null);
  const tableId = useId();

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Not enough history to chart yet.
      </p>
    );
  }

  const peak = Math.max(...data.map((d) => d.value), 1);
  const peakIndex = data.findIndex((d) => d.value === peak);

  return (
    <div className={className}>
      <div
        className="flex h-40 items-stretch gap-[2px]"
        role="img"
        aria-describedby={tableId}
        aria-label={label}
      >
        {data.map((entry, index) => {
          const height = Math.max(3, (entry.value / peak) * 100);
          const isActive = active === index;
          const isPeak = index === peakIndex;

          return (
            <div
              key={entry.month}
              className="group relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              {(isActive || isPeak) && (
                <span
                  className={cn(
                    "mb-1 text-center text-[9px] font-medium tabular-nums",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {format(entry.value)}
                </span>
              )}
              <button
                type="button"
                aria-label={`${entry.month}: ${format(entry.value)}`}
                style={{ height: `${height}%` }}
                className={cn(
                  "w-full rounded-t-[4px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isActive ? "bg-primary" : "bg-primary/60 group-hover:bg-primary",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-[2px] border-t border-border pt-1.5">
        {data.map((entry) => (
          <span
            key={entry.month}
            className="flex-1 text-center text-[9px] text-muted-foreground"
          >
            {entry.month}
          </span>
        ))}
      </div>

      <table id={tableId} className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.month}>
              <th scope="row">{entry.month}</th>
              <td>{format(entry.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
