import { create } from "zustand";

interface CampaignState {
  selectedCampaignId: string | null;
  isCreating: boolean;
  setSelectedCampaign: (id: string | null) => void;
  setIsCreating: (value: boolean) => void;
}

export const useCampaignStore = create<CampaignState>((set) => ({
  selectedCampaignId: null,
  isCreating: false,
  setSelectedCampaign: (id) => set({ selectedCampaignId: id }),
  setIsCreating: (value) => set({ isCreating: value }),
}));
