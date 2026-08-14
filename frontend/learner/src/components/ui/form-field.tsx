"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  /** Point the label at a specific control instead of the cloned child. */
  htmlFor?: string;
}

/**
 * Pairs a label with its control.
 *
 * The control usually arrives without an id — react-hook-form's `register`
 * spreads name/ref but not id — so one is generated here and cloned onto the
 * child. Without it the label is decorative: clicking it does nothing and a
 * screen reader announces an unlabelled field.
 */
function FormField({
  label,
  error,
  children,
  className,
  htmlFor,
}: FormFieldProps) {
  const generatedId = React.useId();
  const errorId = `${generatedId}-error`;

  let controlId = htmlFor ?? generatedId;
  let control = children;

  // Wire up exactly one control. `Children.count` rejects fragments and arrays,
  // where cloning would attach the id to a wrapper rather than a labelable
  // element — the very failure this is meant to prevent. Callers with a group
  // of fields pass `htmlFor` instead and label the control themselves.
  const single =
    React.Children.count(children) === 1 && React.isValidElement(children);

  if (!htmlFor && single && React.isValidElement(children)) {
    const props = children.props as {
      id?: string;
      "aria-describedby"?: string;
    };
    controlId = htmlFor ?? props.id ?? generatedId;
    control = React.cloneElement(children, {
      id: controlId,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error
        ? [props["aria-describedby"], errorId].filter(Boolean).join(" ")
        : props["aria-describedby"],
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          htmlFor={controlId}
          className="text-sm font-medium leading-none"
        >
          {label}
        </label>
      )}
      {control}
      {error && (
        <p id={errorId} className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
