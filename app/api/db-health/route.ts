export const dynamic = "force-dynamic";
import { documentDb } from '@/lib/nda';
import { HealthService, HealthTestFactory } from '@/lib/services/health-service';

export async function GET() {
  // Use centralized health service (DRY: eliminates ~55 lines of duplicated health check logic)
  return HealthService.runHealthChecks([
    HealthTestFactory.createDatabaseTest(documentDb)
  ], {
    service: 'db',
    loggerKey: 'db'
  });
}