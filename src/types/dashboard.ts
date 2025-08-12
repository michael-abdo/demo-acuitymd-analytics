/**
 * Dashboard Statistics Types
 */

export interface DashboardStats {
  documents: number;      // Total analyzed documents (status = 'processed')
  comparisons: number;    // Total completed comparisons
  suggestions: number;    // Total AI suggestions across all comparisons
  exports: number;        // Total exports (currently not implemented)
  lastUpdated: string;    // ISO timestamp of when stats were fetched
}

export interface DashboardStatsResponse {
  success: boolean;
  data?: DashboardStats;
  error?: string;
}

export interface DashboardStatsError {
  metric: keyof DashboardStats;
  error: string;
}