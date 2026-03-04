/**
 * ApprovalProcess Repository Interface
 * Defines the data access contract for approval_processes
 */



export interface ApprovalProcessRow {
  id: number;
  stage_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  responsible_person: string | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateApprovalProcessData {
  stage_name: string;
  start_date: string;
  end_date?: string;
  status: string;
  responsible_person?: string;
  user_id: string;
}

export interface UpdateApprovalProcessData {
  stage_name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  responsible_person?: string;
}

export interface ApprovalProcessQueryOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'stage_name';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedApprovalProcesssResult {
  approval_processes: ApprovalProcessRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IApprovalProcessRepository {
  createApprovalProcess(data: CreateApprovalProcessData): Promise<{ insertId: number }>;
  getApprovalProcessById(id: number): Promise<ApprovalProcessRow | null>;
  getUserApprovalProcesss(userId: string): Promise<ApprovalProcessRow[]>;
  getUserApprovalProcesssWithFilters(userId: string, options: ApprovalProcessQueryOptions): Promise<PaginatedApprovalProcesssResult>;
  updateApprovalProcess(id: number, updates: UpdateApprovalProcessData): Promise<void>;
  deleteApprovalProcess(id: number): Promise<void>;
}
