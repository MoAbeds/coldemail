"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Client-side spam word check (basic heuristic)
const SPAM_TRIGGERS = [
  "free", "act now", "limited time", "urgent", "click here",
  "buy now", "no obligation", "winner", "congratulations", "guarantee",
  "100%", "!!!",  "$$", "million", "cash", "credit",
  "dear friend", "no cost", "risk free", "order now",
];

interface SpamIssue {
  type: "warning" | "error";
  message: string;
}

function analyzeSpam(subject: string, body: string): { score: number; issues: SpamIssue[] } {
  const issues: SpamIssue[] = [];
  let deductions = 0;
  const combined = (subject + " " + body).toLowerCase();

  // Check for spam words
  for (const word of SPAM_TRIGGERS) {
    if (combined.includes(word.toLowerCase())) {
      issues.push({ type: "warning", message: `Contains spam trigger: "${word}"` });
      deductions += 5;
    }
  }

  // Check for excessive caps
  const capsRatio = (subject.replace(/[^A-Z]/g, "").length) / Math.max(subject.length, 1);
  if (capsRatio > 0.5 && subject.length > 5) {
    issues.push({ type: "warning", message: "Subject has excessive capitalization" });
    deductions += 10;
  }

  // Check for too many exclamation marks
  const exclamations = (combined.match(/!/g) || []).length;
  if (exclamations > 2) {
    issues.push({ type: "warning", message: `Too many exclamation marks (${exclamations})` });
    deductions += 5;
  }

  // Check for too many links
  const linkCount = (body.match(/https?:\/\//g) || []).length;
  if (linkCount > 3) {
    issues.push({ type: "warning", message: `Too many links (${linkCount})` });
    deductions += 10;
  }

  // Check subject length
  if (subject.length > 60) {
    issues.push({ type: "warning", message: "Subject line is longer than recommended (60 chars)" });
    deductions += 5;
  }

  // Check body length
  if (body.length < 100) {
    issues.push({ type: "warning", message: "Email body is very short" });
    deductions += 5;
  }

  // Good signals
  if (combined.includes("{{firstname}}") || combined.includes("{{company}}")) {
    // Personalization bonus
    deductions -= 5;
  }

  const score = Math.max(0, Math.min(100, 100 - deductions));
  if (issues.length === 0) {
    issues.push({ type: "warning", message: "No issues detected" });
  }

  return { score, issues };
}

interface Props {
  subject: string;
  body: string;
}

export function SpamScoreChecker({ subject, body }: Props) {
  const [result, setResult] = useState<{ score: number; issues: SpamIssue[] } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  function handleCheck() {
    setIsChecking(true);
    // Simulate brief analysis delay
    setTimeout(() => {
      setResult(analyzeSpam(subject, body));
      setIsChecking(false);
    }, 500);
  }

  const scoreColor = result
    ? result.score >= 80
      ? "text-green-600"
      : result.score >= 50
        ? "text-yellow-600"
        : "text-red-600"
    : "";

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCheck}
        disabled={isChecking || (!subject && !body)}
      >
        {isChecking && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        {isChecking ? "Analyzing..." : "Check Spam Score"}
      </Button>

      {result && (
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn("text-2xl font-bold", scoreColor)}>
              {result.score}
            </span>
            <span className="text-sm text-muted-foreground">/100</span>
            <span className={cn("ml-auto text-sm font-medium", scoreColor)}>
              {result.score >= 80
                ? "Looks good"
                : result.score >= 50
                  ? "Needs improvement"
                  : "High spam risk"}
            </span>
          </div>
          <div className="space-y-1">
            {result.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                {issue.message === "No issues detected" ? (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
                ) : issue.type === "error" ? (
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-yellow-500" />
                )}
                <span className="text-muted-foreground">{issue.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
