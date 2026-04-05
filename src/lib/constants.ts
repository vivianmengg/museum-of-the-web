export const PAGE_SIZE = 12;

export type BrowseFilters = {
  q?: string;
  culture?: string;
  medium?: string;
  dateBegin?: string;
  dateEnd?: string;
  publicDomain?: boolean;
};
