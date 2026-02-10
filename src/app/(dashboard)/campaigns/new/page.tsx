"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCampaignWizardStore } from "@/store/campaign-wizard-store";

export default function CampaignNewPage() {
  const router = useRouter();
  const currentStep = useCampaignWizardStore((s) => s.currentStep);

  useEffect(() => {
    const stepRoutes: Record<number, string> = {
      1: "/campaigns/new/basics",
      2: "/campaigns/new/email",
      3: "/campaigns/new/sequence",
      4: "/campaigns/new/review",
    };
    router.replace(stepRoutes[currentStep] || "/campaigns/new/basics");
  }, [currentStep, router]);

  return null;
}
