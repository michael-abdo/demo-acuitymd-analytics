/**
 * ApprovalProcess Service Interface
 * Defines the contract for approval_process business logic operations
 */

import {
  ApprovalProcessRow,
  ApprovalProcessQueryOptions
} from '../../repositories/interfaces/approval_process.repository.interface';

export interface IApprovalProcessService {
  getUserApprovalProcesss(userId: string, options?: ApprovalProcessQueryOptions): Promise<ApprovalProcessListResponse>;
  getApprovalProcessById(id: number, userId: string): Promise<ApprovalProcessResponse>;
  createApprovalProcess(data: CreateApprovalProcessInput, userId: string): Promise<ApprovalProcessResponse>;
  updateApprovalProcess(id: number, updates: UpdateApprovalProcessInput, userId: string): Promise<ApprovalProcessResponse>;
  deleteApprovalProcess(id: number, userId: string): Promise<void>;
  transformApprovalProcessForAPI(row: ApprovalProcessRow): ApprovalProcessResponse;
}

export interface CreateApprovalProcessInput {
  stage_name: string;
  start_date: string;
  end_date?: string;
  status: string;
  responsible_person?: string;
}

export interface UpdateApprovalProcessInput {
  stage_name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  responsible_person?: string;
}

export interface ApprovalProcessResponse {
  id: number;
  stage_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  responsible_person: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalProcessListResponse {
  approval_processes: ApprovalProcessResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
