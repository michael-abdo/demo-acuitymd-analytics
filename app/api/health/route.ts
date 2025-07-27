export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { HealthService } from '@/lib/services/health-service';

/**
 * Health check endpoint for monitoring systems (Docker, PM2, load balancers)
 * Returns system status without authentication
 */
export async function GET(request: NextRequest) {
  // Use centralized health service (DRY: eliminates ~18 lines of duplicated health check logic)
  return HealthService.runSimpleHealthCheck('vvg-template');
}