/**
 * ApprovalProcess Service
 * Business logic for approval_process operations
 */

import { approvalProcessRepository, ApprovalProcessRepository } from '../repositories/approval_process.repository';
import {
  ApprovalProcessRow,
  ApprovalProcessQueryOptions,
  CreateApprovalProcessData,
  UpdateApprovalProcessData
} from '../repositories/interfaces/approval_process.repository.interface';
import {
  IApprovalProcessService,
  ApprovalProcessResponse,
  ApprovalProcessListResponse,
  CreateApprovalProcessInput,
  UpdateApprovalProcessInput
} from './interfaces/approval_process.service.interface';

export class ApprovalProcessService implements IApprovalProcessService {
  constructor(private repository: ApprovalProcessRepository = approvalProcessRepository) {}

  async getUserApprovalProcesss(userId: string, options: ApprovalProcessQueryOptions = {}): Promise<ApprovalProcessListResponse> {
    if (!userId?.trim()) {
      throw new Error('Valid userId is required');
    }

    const { approval_processes, total, page, pageSize } = await this.repository.getUserApprovalProcesssWithFilters(
      userId,
      options
    );

    return {
      approval_processes: approval_processes.map(row => this.transformApprovalProcessForAPI(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0
      }
    };
  }

  async getApprovalProcessById(id: number, userId: string): Promise<ApprovalProcessResponse> {
    if (!id || id < 1) {
      throw new Error('Valid approval_process ID is required');
    }

    const row = await this.repository.getApprovalProcessById(id);

    if (!row) {
      throw new Error('ApprovalProcess not found');
    }

    if (row.user_id !== userId) {
      throw new Error('Access denied');
    }

    return this.transformApprovalProcessForAPI(row);
  }

  async createApprovalProcess(data: CreateApprovalProcessInput, userId: string): Promise<ApprovalProcessResponse> {
    if (!data?.stage_name?.toString().trim()) {
      throw new Error('Missing required field: stage_name');
    }

    const result = await this.repository.createApprovalProcess({
      ...data,
      user_id: userId
    } as CreateApprovalProcessData);

    const created = await this.repository.getApprovalProcessById(result.insertId);
    if (!created) {
      throw new Error('Failed to retrieve created approval_process');
    }

    return this.transformApprovalProcessForAPI(created);
  }

  async updateApprovalProcess(id: number, updates: UpdateApprovalProcessInput, userId: string): Promise<ApprovalProcessResponse> {
    const existing = await this.repository.getApprovalProcessById(id);

    if (!existing) {
      throw new Error('ApprovalProcess not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('Access denied');
    }

    await this.repository.updateApprovalProcess(id, updates as UpdateApprovalProcessData);

    const updated = await this.repository.getApprovalProcessById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated approval_process');
    }

    return this.transformApprovalProcessForAPI(updated);
  }

  async deleteApprovalProcess(id: number, userId: string): Promise<void> {
    const existing = await this.repository.getApprovalProcessById(id);

    if (!existing) {
      throw new Error('ApprovalProcess not found');
    }

    if (existing.user_id !== userId) {
      throw new Error('Access denied');
    }

    await this.repository.deleteApprovalProcess(id);
  }

  transformApprovalProcessForAPI(row: ApprovalProcessRow): ApprovalProcessResponse {
    return {
      id: row.id,
      stage_name: row.stage_name,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      responsible_person: row.responsible_person,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }
}

export const approvalProcessService = new ApprovalProcessService();
