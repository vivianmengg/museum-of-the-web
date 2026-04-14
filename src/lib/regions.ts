export type Region = {
  id: string;
  label: string;
  color: string;
};

export const REGIONS: Region[] = [
  { id: "asia",      label: "Asia",               color: "#4A7C59" },
  { id: "europe",    label: "Europe",             color: "#4A5E7A" },
  { id: "africa",    label: "Africa",             color: "#7A3E2A" },
  { id: "americas",  label: "The Americas",       color: "#8B3A2A" },
  { id: "near-east", label: "Ancient Near East",  color: "#8B4513" },
  { id: "islamic",   label: "Islamic World",      color: "#1E6B7A" },
  { id: "oceania",   label: "Oceania",            color: "#2E7B6B" },
];
