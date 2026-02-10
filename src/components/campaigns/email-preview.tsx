"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const sampleProspects = [
  {
    FirstName: "Sarah",
    LastName: "Chen",
    Email: "sarah@acme.com",
    Company: "Acme Inc",
    JobTitle: "VP of Sales",
  },
  {
    FirstName: "James",
    LastName: "Wilson",
    Email: "james@startupco.io",
    Company: "StartupCo",
    JobTitle: "CEO",
  },
  {
    FirstName: "Maria",
    LastName: "Garcia",
    Email: "maria@enterprise.com",
    Company: "Enterprise Corp",
    JobTitle: "Head of Growth",
  },
];

function renderTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

interface Props {
  subject: string;
  body: string;
  senderName?: string;
  senderEmail?: string;
}

export function EmailPreview({
  subject,
  body,
  senderName = "You",
  senderEmail = "you@company.com",
}: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [prospectIdx, setProspectIdx] = useState(0);
  const prospect = sampleProspects[prospectIdx];

  const renderedSubject = renderTemplate(subject, prospect);
  const renderedBody = renderTemplate(body, prospect);

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              device === "desktop"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              device === "mobile"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
        <select
          value={prospectIdx}
          onChange={(e) => setProspectIdx(Number(e.target.value))}
          className="rounded-md border bg-background px-2 py-1 text-xs"
        >
          {sampleProspects.map((p, i) => (
            <option key={i} value={i}>
              {p.FirstName} {p.LastName} — {p.Company}
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div
          className={cn(
            "mx-auto rounded-lg border bg-white shadow-sm",
            device === "mobile" ? "max-w-[320px]" : "max-w-full"
          )}
        >
          {/* Email header */}
          <div className="border-b px-4 py-3 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{senderName}</span>
              <span className="text-muted-foreground">
                &lt;{senderEmail}&gt;
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              To: {prospect.FirstName} {prospect.LastName} &lt;{prospect.Email}
              &gt;
            </div>
            <div className="text-sm font-medium">
              {renderedSubject || (
                <span className="italic text-muted-foreground">
                  No subject
                </span>
              )}
            </div>
          </div>

          {/* Email body */}
          <div
            className={cn(
              "px-4 py-4 text-sm leading-relaxed whitespace-pre-wrap",
              device === "mobile" ? "text-xs" : "text-sm"
            )}
          >
            {renderedBody || (
              <span className="italic text-muted-foreground">
                Start writing your email...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
