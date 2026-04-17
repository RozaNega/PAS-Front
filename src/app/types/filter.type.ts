export interface FilterOption {
  value: string;
  label: string;
}

export interface DateRangeFilter {
  fromDate: Date | null;
  toDate: Date | null;
}

export interface StatusFilter {
  status: string;
  label: string;
  color: string;
}