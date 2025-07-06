import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ApiResponse } from '@/lib/auth-utils';
import { ApiErrors } from '@/lib/utils';
import { documentDb, comparisonDb } from '@/lib/nda/database';
import { DocumentStatus, ComparisonStatus } from '@/types/nda';
import { DashboardStats, DashboardStatsResponse } from '@/types/dashboard';

export const GET = withAuth(async (request: NextRequest, userEmail: string) => {
  try {
    const errors: Array<{ metric: string; error: string }> = [];

    // Initialize stats with defaults
    let documentsCount = 0;
    let comparisonsCount = 0;
    let suggestionsCount = 0;
    const exportsCount = 0; // Not implemented yet

    // Fetch documents count (only processed ones count as "analyzed")
    try {
      const documents = await documentDb.findByUser(userEmail);
      documentsCount = documents.filter(doc => doc.status === DocumentStatus.PROCESSED).length;
    } catch (error) {
      console.error('Error fetching documents:', error);
      errors.push({ metric: 'documents', error: 'Failed to fetch documents' });
    }

    // Fetch comparisons count (only completed ones)
    try {
      const comparisons = await comparisonDb.findByUser(userEmail);
      comparisonsCount = comparisons.filter(comp => comp.status === ComparisonStatus.COMPLETED).length;
      
      // Calculate total suggestions across all comparisons
      suggestionsCount = comparisons.reduce((total, comp) => {
        return total + (comp.ai_suggestions?.length || 0);
      }, 0);
    } catch (error) {
      console.error('Error fetching comparisons:', error);
      errors.push({ metric: 'comparisons', error: 'Failed to fetch comparisons' });
      errors.push({ metric: 'suggestions', error: 'Failed to calculate suggestions' });
    }

    // TODO: Implement exports count when exportDb is available
    // For now, exports count remains 0

    const stats: DashboardStats = {
      documents: documentsCount,
      comparisons: comparisonsCount,
      suggestions: suggestionsCount,
      exports: exportsCount,
      lastUpdated: new Date().toISOString()
    };

    // Use ApiResponse with cache headers
    const responseData = errors.length > 0 
      ? { ...stats, errors } 
      : stats;
      
    return ApiResponse.successWithHeaders(
      responseData,
      { 'Cache-Control': 'private, max-age=60' }
    );

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return ApiErrors.serverError('Failed to fetch dashboard statistics');
  }
});