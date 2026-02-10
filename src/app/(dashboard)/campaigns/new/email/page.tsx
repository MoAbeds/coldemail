"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCampaignWizardStore } from "@/store/campaign-wizard-store";
import {
  wizardEmailSchema,
  type WizardEmailInput,
} from "@/lib/validations/campaign-wizard";
import { VariableInserter } from "@/components/campaigns/variable-inserter";
import { SpamScoreChecker } from "@/components/campaigns/spam-score";
import { EmailPreview } from "@/components/campaigns/email-preview";

export default function CampaignEmailPage() {
  const router = useRouter();
  const { email, setEmail, setCurrentStep } = useCampaignWizardStore();
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WizardEmailInput>({
    resolver: zodResolver(wizardEmailSchema),
    defaultValues: {
      subject: email.subject,
      body: email.body,
    },
  });

  const watchSubject = watch("subject");
  const watchBody = watch("body");

  useEffect(() => {
    setCurrentStep(2);
  }, [setCurrentStep]);

  // Register refs for subject and body
  const { ref: subjectRegRef, ...subjectRest } = register("subject");
  const { ref: bodyRegRef, ...bodyRest } = register("body");

  function insertVariable(tag: string) {
    const el = bodyRef.current;
    if (!el) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newValue =
      el.value.substring(0, start) + tag + el.value.substring(end);
    setValue("body", newValue, { shouldValidate: true });

    // Restore cursor after tag
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  function onSubmit(data: WizardEmailInput) {
    setEmail({ subject: data.subject, body: data.body });
    setCurrentStep(3);
    router.push("/campaigns/new/sequence");
  }

  function handleBack() {
    setEmail({ subject: watchSubject, body: watchBody });
    setCurrentStep(1);
    router.push("/campaigns/new/basics");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-4 sm:px-6 py-4 sm:py-8">
      <div className="flex gap-6" style={{ minHeight: "calc(100vh - 280px)" }}>
        {/* Editor — left */}
        <div className="flex w-3/5 flex-col space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject Line *</Label>
              <span className="text-xs text-muted-foreground">
                {watchSubject?.length || 0}/60 recommended
              </span>
            </div>
            <Input
              id="subject"
              placeholder="e.g., Quick question about {{Company}}"
              maxLength={150}
              ref={(el) => {
                subjectRegRef(el);
                subjectRef.current = el;
              }}
              {...subjectRest}
            />
            {errors.subject && (
              <p className="text-xs text-destructive">
                {errors.subject.message}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 space-y-2">
            <Label htmlFor="body">Email Body *</Label>
            <textarea
              id="body"
              className="flex min-h-[300px] w-full flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={`Hi {{FirstName}},\n\nI noticed {{Company}} is...\n\nWould love to chat about how we can help.\n\nBest,\nYour Name`}
              ref={(el) => {
                bodyRegRef(el);
                bodyRef.current = el;
              }}
              {...bodyRest}
            />
            {errors.body && (
              <p className="text-xs text-destructive">
                {errors.body.message}
              </p>
            )}
          </div>

          {/* Variable inserter */}
          <VariableInserter onInsert={insertVariable} />

          {/* Spam score */}
          <SpamScoreChecker subject={watchSubject} body={watchBody} />
        </div>

        {/* Preview — right */}
        <div className="w-2/5 rounded-lg border">
          <EmailPreview subject={watchSubject} body={watchBody} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between">
        <Button type="button" variant="ghost" onClick={handleBack}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEmail({ subject: watchSubject, body: watchBody });
            }}
          >
            Save Draft
          </Button>
          <Button type="submit">Next: Build Sequence</Button>
        </div>
      </div>
    </form>
  );
}
