export const PAGE_SIZE = 12;

export type BrowseFilters = {
  q?: string;
  // Pill filters — map directly to indexed DB columns
  countryFilter?: string;    // objects_cache.country  (e.g. "Japan")
  continentFilter?: string;  // objects_cache.continent (e.g. "africa")
  materialId?: string;       // objects_cache.material  (e.g. "ceramics")
  // Legacy text filters (used by search bar)
  culture?: string;
  medium?: string;
  dateBegin?: string;
  dateEnd?: string;
  publicDomain?: boolean;
};
