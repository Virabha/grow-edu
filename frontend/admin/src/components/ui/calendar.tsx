"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  defaultMonth?: Date;
  className?: string;
  fromYear?: number;
  toYear?: number;
};

function Calendar({
  className,
  selected,
  onSelect,
  defaultMonth,
  fromYear = 1970,
  toYear = new Date().getFullYear() + 10,
}: CalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      defaultMonth={defaultMonth}
      captionLayout="dropdown"
      startMonth={new Date(fromYear, 0)}
      endMonth={new Date(toYear, 11)}
      className={cn("p-3 [&_.rdp-day_button:hover]:bg-accent", className)}
      classNames={{
        root: "rdp-root",
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        dropdowns: "flex items-center gap-1.5",
        dropdown:
          "h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring",
        nav: "absolute inset-x-0 top-1 flex items-center justify-between px-1",
        button_previous:
          "inline-flex items-center justify-center rounded-md h-7 w-7 p-0 opacity-70 hover:bg-accent hover:text-accent-foreground border border-input bg-transparent",
        button_next:
          "inline-flex items-center justify-center rounded-md h-7 w-7 p-0 opacity-70 hover:bg-accent hover:text-accent-foreground border border-input bg-transparent",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.7rem] uppercase tracking-wider",
        week: "flex w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button:
          "inline-flex items-center justify-center rounded-md text-sm font-normal h-9 w-9 p-0 transition-colors hover:bg-accent hover:text-accent-foreground",
        selected:
          "[&_.rdp-day_button]:bg-primary [&_.rdp-day_button]:text-primary-foreground [&_.rdp-day_button:hover]:bg-primary",
        today:
          "[&_.rdp-day_button]:bg-accent [&_.rdp-day_button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
      }}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
