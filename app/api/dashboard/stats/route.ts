import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { documentDb, comparisonDb } from '@/lib/nda/database';
import { DocumentStatus, ComparisonStatus } from '@/types/nda';
import { DashboardStats, DashboardStatsResponse } from '@/types/dashboard';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as DashboardStatsResponse,
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
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

    // Add cache headers for performance (cache for 1 minute)
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=60');

    return NextResponse.json(
      {
        success: true,
        data: stats,
        ...(errors.length > 0 && { errors })
      } as DashboardStatsResponse,
      { headers }
    );

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard statistics'
      } as DashboardStatsResponse,
      { status: 500 }
    );
  }
}