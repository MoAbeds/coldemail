"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const defaultVariables = [
  { tag: "{{FirstName}}", label: "First Name" },
  { tag: "{{LastName}}", label: "Last Name" },
  { tag: "{{Email}}", label: "Email" },
  { tag: "{{Company}}", label: "Company" },
  { tag: "{{JobTitle}}", label: "Job Title" },
];

interface Props {
  onInsert: (tag: string) => void;
}

export function VariableInserter({ onInsert }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        Merge Tags
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {isOpen && (
        <div className="border-t px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {defaultVariables.map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => onInsert(v.tag)}
                className="rounded-md bg-secondary px-2 py-1 text-xs font-mono hover:bg-secondary/80 transition-colors"
              >
                {v.tag}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Click a tag to insert it at cursor position
          </p>
        </div>
      )}
    </div>
  );
}
