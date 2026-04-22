export type Institution = {
  id: string;
  label: string;
  shortName: string;
  location: string;
  country: string;
  website: string;
  description: string;
  founded?: number;
  color: string;
  claimed: boolean;
};

export const INSTITUTIONS: Institution[] = [
  {
    id: "met",
    label: "The Metropolitan Museum of Art",
    shortName: "The Met",
    location: "New York, NY",
    country: "United States",
    website: "https://www.metmuseum.org",
    description:
      "One of the world's largest and most visited art museums, the Met holds over two million works spanning five thousand years of culture — from ancient Egypt to contemporary art.",
    founded: 1870,
    color: "#8B4513",
    claimed: false,
  },
  {
    id: "aic",
    label: "Art Institute of Chicago",
    shortName: "Art Institute",
    location: "Chicago, IL",
    country: "United States",
    website: "https://www.artic.edu",
    description:
      "Founded in 1879, the Art Institute of Chicago is one of the oldest and largest art museums in the United States, renowned for its Impressionist and Post-Impressionist paintings and extensive Asian art collection.",
    founded: 1879,
    color: "#6B3A2A",
    claimed: false,
  },
  {
    id: "cleveland",
    label: "Cleveland Museum of Art",
    shortName: "Cleveland Museum",
    location: "Cleveland, OH",
    country: "United States",
    website: "https://www.clevelandart.org",
    description:
      "One of the most distinguished art museums in North America, the Cleveland Museum holds over 45,000 works with particular strengths in Asian art, medieval European art, and African objects.",
    founded: 1916,
    color: "#2C5F6B",
    claimed: false,
  },
  {
    id: "harvard",
    label: "Harvard Art Museums",
    shortName: "Harvard Art Museums",
    location: "Cambridge, MA",
    country: "United States",
    website: "https://harvardartmuseums.org",
    description:
      "Three museums united under one roof — the Fogg, Busch-Reisinger, and Arthur M. Sackler — Harvard's collection spans antiquity to the present with particular depth in Western art and Asian material culture.",
    founded: 1895,
    color: "#9B2335",
    claimed: false,
  },
  {
    id: "smithsonian",
    label: "Smithsonian's National Museum of Asian Art",
    shortName: "Freer & Sackler",
    location: "Washington, DC",
    country: "United States",
    website: "https://asia.si.edu",
    description:
      "The Freer Gallery of Art and the Arthur M. Sackler Gallery together form America's national museum of Asian art, housing over 40,000 works from the ancient world to the present day.",
    founded: 1923,
    color: "#4A5E3A",
    claimed: false,
  },
  {
    id: "princeton",
    label: "Princeton University Art Museum",
    shortName: "Princeton Art Museum",
    location: "Princeton, NJ",
    country: "United States",
    website: "https://artmuseum.princeton.edu",
    description:
      "One of the leading university art museums in the world, Princeton's collection spans five millennia and six continents, with renowned holdings in Chinese painting, ancient Greek vases, and medieval European art.",
    founded: 1882,
    color: "#FF6600",
    claimed: false,
  },
  {
    id: "colbase",
    label: "ColBase — National Institutes for Cultural Heritage",
    shortName: "ColBase",
    location: "Tokyo",
    country: "Japan",
    website: "https://colbase.nich.go.jp",
    description:
      "ColBase aggregates the collections of Japan's four national museums — Tokyo, Kyoto, Nara, and Kyushu — providing open access to thousands of Japanese cultural heritage objects.",
    color: "#8B2252",
    claimed: false,
  },
];

export function findInstitutionById(id: string): Institution | undefined {
  return INSTITUTIONS.find((i) => i.id === id);
}
