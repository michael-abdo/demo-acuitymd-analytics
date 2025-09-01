// Dashboard types
export interface DashboardStats {
  totalDocuments: number;
  totalUsers: number;
  processingJobs: number;
  documents: number;
  comparisons: number;
  suggestions: number;
  exports: number;
}

export interface DashboardStatsResponse {
  stats: DashboardStats;
}

export interface DashboardDocument {
  id: string;
  filename: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}