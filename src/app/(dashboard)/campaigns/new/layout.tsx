"use client";

import { useEffect } from "react";
import { WizardProgress } from "@/components/campaigns/wizard-progress";
import { useCampaignWizardStore } from "@/store/campaign-wizard-store";

export default function CampaignWizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentStep, loadDraft } = useCampaignWizardStore();

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Create Campaign
        </h1>
        <WizardProgress currentStep={currentStep} />
      </div>
      {children}
    </div>
  );
}
