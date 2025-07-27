export const dynamic = "force-dynamic";
import { storage } from '@/lib/storage';
import { HealthService, HealthTestFactory } from '@/lib/services/health-service';

export async function GET() {
  // Use centralized health service (DRY: eliminates ~110 lines of duplicated health check logic)
  return HealthService.runHealthChecks([
    HealthTestFactory.createStorageTest(storage)
  ], {
    service: 'storage',
    loggerKey: 'storage'
  });
}