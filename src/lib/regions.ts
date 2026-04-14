export type RegionCountry = {
  slug: string;      // URL param: /region/[slug]
  label: string;     // Display name
  continent: string; // Parent continent id — used to scope DB queries
  dbValue: string;   // Matches objects_cache.country
};

export type Region = {
  id: string;
  label: string;
  color: string;
  countries: RegionCountry[];
};

export const REGIONS: Region[] = [
  {
    id: "asia",
    label: "Asia",
    color: "#4A7C59",
    countries: [
      { slug: "china",     label: "China",     continent: "asia", dbValue: "China" },
      { slug: "japan",     label: "Japan",     continent: "asia", dbValue: "Japan" },
      { slug: "korea",     label: "Korea",     continent: "asia", dbValue: "Korea" },
      { slug: "india",     label: "India",     continent: "asia", dbValue: "India" },
      { slug: "cambodia",  label: "Cambodia",  continent: "asia", dbValue: "Cambodia" },
      { slug: "thailand",  label: "Thailand",  continent: "asia", dbValue: "Thailand" },
      { slug: "tibet",     label: "Tibet",     continent: "asia", dbValue: "Tibet" },
      { slug: "nepal",     label: "Nepal",     continent: "asia", dbValue: "Nepal" },
      { slug: "vietnam",   label: "Vietnam",   continent: "asia", dbValue: "Vietnam" },
      { slug: "indonesia", label: "Indonesia", continent: "asia", dbValue: "Indonesia" },
      { slug: "myanmar",   label: "Myanmar",   continent: "asia", dbValue: "Myanmar" },
    ],
  },
  {
    id: "europe",
    label: "Europe",
    color: "#4A5E7A",
    countries: [
      { slug: "greece",      label: "Greece",            continent: "europe", dbValue: "Greece" },
      { slug: "italy",       label: "Italy",             continent: "europe", dbValue: "Italy" },
      { slug: "france",      label: "France",            continent: "europe", dbValue: "France" },
      { slug: "netherlands", label: "Netherlands",       continent: "europe", dbValue: "Netherlands" },
      { slug: "flanders",    label: "Flanders",          continent: "europe", dbValue: "Belgium" },
      { slug: "germany",     label: "Germany & Austria", continent: "europe", dbValue: "Germany / Austria" },
      { slug: "spain",       label: "Spain",             continent: "europe", dbValue: "Spain" },
      { slug: "britain",     label: "Britain",           continent: "europe", dbValue: "United Kingdom" },
      { slug: "scandinavia", label: "Scandinavia",       continent: "europe", dbValue: "Scandinavia" },
      { slug: "byzantium",   label: "Byzantine Empire",  continent: "europe", dbValue: "Byzantine Empire" },
      { slug: "russia",      label: "Russia",            continent: "europe", dbValue: "Russia" },
    ],
  },
  {
    id: "africa",
    label: "Africa",
    color: "#7A3E2A",
    countries: [
      { slug: "egypt",       label: "Egypt",           continent: "africa", dbValue: "Egypt" },
      { slug: "nigeria",     label: "Nigeria",         continent: "africa", dbValue: "Nigeria" },
      { slug: "mali",        label: "Mali",            continent: "africa", dbValue: "Mali" },
      { slug: "ghana",       label: "Ghana",           continent: "africa", dbValue: "Ghana" },
      { slug: "ethiopia",    label: "Ethiopia",        continent: "africa", dbValue: "Ethiopia" },
      { slug: "dr-congo",    label: "DR Congo",        continent: "africa", dbValue: "DR Congo" },
      { slug: "ivory-coast", label: "Côte d'Ivoire",   continent: "africa", dbValue: "Côte d'Ivoire" },
    ],
  },
  {
    id: "near-east",
    label: "Ancient Near East",
    color: "#8B4513",
    countries: [
      { slug: "mesopotamia", label: "Mesopotamia", continent: "near-east", dbValue: "Iraq" },
      { slug: "persia",      label: "Persia",      continent: "near-east", dbValue: "Iran" },
      { slug: "anatolia",    label: "Anatolia",    continent: "near-east", dbValue: "Turkey" },
      { slug: "levant",      label: "Levant",      continent: "near-east", dbValue: "Levant" },
      { slug: "syria",       label: "Syria",       continent: "near-east", dbValue: "Syria" },
    ],
  },
  {
    id: "islamic",
    label: "Islamic World",
    color: "#1E6B7A",
    countries: [
      { slug: "ottoman",     label: "Ottoman Empire", continent: "islamic", dbValue: "Turkey" },
      { slug: "safavid",     label: "Persia & Iran",  continent: "islamic", dbValue: "Iran" },
      { slug: "mughal",      label: "Mughal India",   continent: "islamic", dbValue: "India" },
      { slug: "morocco",     label: "Morocco",        continent: "islamic", dbValue: "Morocco" },
      { slug: "al-andalus",  label: "Al-Andalus",     continent: "islamic", dbValue: "Spain" },
      { slug: "central-asia",label: "Central Asia",   continent: "islamic", dbValue: "Central Asia" },
    ],
  },
  {
    id: "americas",
    label: "The Americas",
    color: "#8B3A2A",
    countries: [
      { slug: "mexico",         label: "Mexico",        continent: "americas", dbValue: "Mexico" },
      { slug: "maya",           label: "Maya",          continent: "americas", dbValue: "Mexico / Guatemala" },
      { slug: "peru",           label: "Peru",          continent: "americas", dbValue: "Peru" },
      { slug: "colombia",       label: "Colombia",      continent: "americas", dbValue: "Colombia" },
      { slug: "costa-rica",     label: "Costa Rica",    continent: "americas", dbValue: "Costa Rica" },
      { slug: "native-america", label: "Native America",continent: "americas", dbValue: "United States" },
    ],
  },
  {
    id: "oceania",
    label: "Oceania",
    color: "#2E7B6B",
    countries: [
      { slug: "hawaii",      label: "Hawaii",           continent: "oceania", dbValue: "Hawaii" },
      { slug: "new-zealand", label: "New Zealand",      continent: "oceania", dbValue: "New Zealand" },
      { slug: "papua",       label: "Papua New Guinea", continent: "oceania", dbValue: "Papua New Guinea" },
      { slug: "polynesia",   label: "Polynesia",        continent: "oceania", dbValue: "Oceania" },
    ],
  },
];

// Find a country by slug across all regions
export function findCountryBySlug(slug: string): RegionCountry | undefined {
  for (const region of REGIONS) {
    const country = region.countries.find((c) => c.slug === slug);
    if (country) return country;
  }
  return undefined;
}

// Find a region by id
export function findRegionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}
