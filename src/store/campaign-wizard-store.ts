"use client";

import { create } from "zustand";

export type CampaignGoal =
  | "replies"
  | "meetings"
  | "clicks"
  | "leads"
  | null;

export type SequenceStepType = "EMAIL" | "WAIT" | "CONDITION" | "TASK";

export interface SequenceStep {
  id: string;
  stepNumber: number;
  type: SequenceStepType;
  subject?: string;
  body?: string;
  delayDays: number;
  delayHours: number;
  condition?: {
    type: "link_clicked" | "no_reply" | "opened";
    thenStep?: number;
    elseStep?: number;
  };
  taskDescription?: string;
}

export interface WizardBasics {
  campaignName: string;
  emailAccountId: string;
  goal: CampaignGoal;
  dailyLimit: number;
  teamId: string;
}

export interface WizardEmail {
  subject: string;
  body: string;
}

export interface WizardSchedule {
  startHour: number;
  endHour: number;
  days: number[];
  timezone: string;
  startImmediately: boolean;
  scheduledDate: string | null;
}

interface CampaignWizardState {
  currentStep: number;
  basics: WizardBasics;
  email: WizardEmail;
  sequence: SequenceStep[];
  schedule: WizardSchedule;

  setCurrentStep: (step: number) => void;
  setBasics: (basics: Partial<WizardBasics>) => void;
  setEmail: (email: Partial<WizardEmail>) => void;
  setSequence: (sequence: SequenceStep[]) => void;
  addSequenceStep: (step: SequenceStep) => void;
  updateSequenceStep: (id: string, updates: Partial<SequenceStep>) => void;
  removeSequenceStep: (id: string) => void;
  setSchedule: (schedule: Partial<WizardSchedule>) => void;
  reset: () => void;
  loadDraft: () => void;
  saveDraft: () => void;
}

const DRAFT_KEY = "coldclaude-campaign-draft";

const initialBasics: WizardBasics = {
  campaignName: "",
  emailAccountId: "",
  goal: null,
  dailyLimit: 50,
  teamId: "",
};

const initialEmail: WizardEmail = {
  subject: "",
  body: "",
};

const initialSchedule: WizardSchedule = {
  startHour: 9,
  endHour: 17,
  days: [1, 2, 3, 4, 5],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  startImmediately: true,
  scheduledDate: null,
};

export const useCampaignWizardStore = create<CampaignWizardState>(
  (set, get) => ({
    currentStep: 1,
    basics: initialBasics,
    email: initialEmail,
    sequence: [],
    schedule: initialSchedule,

    setCurrentStep: (step) => {
      set({ currentStep: step });
      get().saveDraft();
    },

    setBasics: (updates) => {
      set((state) => ({
        basics: { ...state.basics, ...updates },
      }));
      get().saveDraft();
    },

    setEmail: (updates) => {
      set((state) => ({
        email: { ...state.email, ...updates },
      }));
      get().saveDraft();
    },

    setSequence: (sequence) => {
      set({ sequence });
      get().saveDraft();
    },

    addSequenceStep: (step) => {
      set((state) => ({
        sequence: [...state.sequence, step],
      }));
      get().saveDraft();
    },

    updateSequenceStep: (id, updates) => {
      set((state) => ({
        sequence: state.sequence.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }));
      get().saveDraft();
    },

    removeSequenceStep: (id) => {
      set((state) => ({
        sequence: state.sequence
          .filter((s) => s.id !== id)
          .map((s, i) => ({ ...s, stepNumber: i + 2 })),
      }));
      get().saveDraft();
    },

    setSchedule: (updates) => {
      set((state) => ({
        schedule: { ...state.schedule, ...updates },
      }));
      get().saveDraft();
    },

    reset: () => {
      set({
        currentStep: 1,
        basics: initialBasics,
        email: initialEmail,
        sequence: [],
        schedule: initialSchedule,
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem(DRAFT_KEY);
      }
    },

    loadDraft: () => {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        set({
          currentStep: draft.currentStep ?? 1,
          basics: { ...initialBasics, ...draft.basics },
          email: { ...initialEmail, ...draft.email },
          sequence: draft.sequence ?? [],
          schedule: { ...initialSchedule, ...draft.schedule },
        });
      } catch {
        // Ignore corrupt drafts
      }
    },

    saveDraft: () => {
      if (typeof window === "undefined") return;
      const { currentStep, basics, email, sequence, schedule } = get();
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ currentStep, basics, email, sequence, schedule })
        );
      } catch {
        // Ignore storage errors
      }
    },
  })
);
