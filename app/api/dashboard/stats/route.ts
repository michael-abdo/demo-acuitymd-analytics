export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { withAuth, ApiResponse, ApiErrors, TimestampUtils } from '@/lib/auth-utils';
import { documentDb, comparisonDb } from '@/lib/nda/database';
import { DocumentStatus, ComparisonStatus } from '@/types/nda';
import { DashboardStats, DashboardStatsResponse } from '@/types/dashboard';
import { withApiLogging, ApiLoggerContext } from '@/lib/decorators/api-logger';
import { DocumentService } from '@/lib/services/document-service';
import { EnvironmentHelpers } from '@/lib/config';

// Use the new logging decorator (DRY principle)
export const GET = withAuth(withApiLogging('DASHBOARD-STATS', async (
  request: NextRequest, 
  userEmail: string, 
  logger: ApiLoggerContext
) => {
  try {
    const errors: Array<{ metric: string; error: string }> = [];

    // Initialize stats with defaults
    let documentsCount = 0;
    let comparisonsCount = 0;
    let suggestionsCount = 0;
    const exportsCount = 0; // Not implemented yet

    // Fetch documents count (only processed ones count as "analyzed")
    logger.step('Fetching user documents for stats calculation');
    try {
      const documents = await DocumentService.getUserDocuments(userEmail);
      documentsCount = documents.filter(doc => doc.status === DocumentStatus.PROCESSED).length;
      logger.step('Documents count calculated', { total: documents.length, processed: documentsCount });
    } catch (error) {
      logger.error('Failed to fetch documents for stats', error as Error);
      errors.push({ metric: 'documents', error: 'Failed to fetch documents' });
    }

    // Fetch comparisons count (only completed ones)
    logger.step('Fetching user comparisons for stats calculation');
    try {
      const comparisons = await comparisonDb.findByUser(userEmail);
      comparisonsCount = comparisons.filter(comp => comp.status === ComparisonStatus.COMPLETED).length;
      
      // Calculate total suggestions across all comparisons
      suggestionsCount = comparisons.reduce((total, comp) => {
        return total + (comp.ai_suggestions?.length || 0);
      }, 0);
      
      logger.step('Comparisons and suggestions calculated', { 
        total: comparisons.length, 
        completed: comparisonsCount,
        suggestions: suggestionsCount 
      });
    } catch (error) {
      logger.error('Failed to fetch comparisons for stats', error as Error);
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
      lastUpdated: TimestampUtils.now()
    };

    // Log final stats
    logger.step('Dashboard stats compiled', { 
      stats, 
      errorsCount: errors.length,
      hasErrors: errors.length > 0 
    });

    // Use ApiResponse with cache headers
    const responseData = errors.length > 0 
      ? { ...stats, errors } 
      : stats;
      
    const response = ApiResponse.operation('admin.stats', {
      result: responseData,
      metadata: {
        hasDatabase: EnvironmentHelpers.hasDbAccess(),
        source: EnvironmentHelpers.hasDbAccess() ? 'database' : 'memory'
      }
    });
    
    response.headers.set('Cache-Control', 'private, max-age=60');
    return response;

}));