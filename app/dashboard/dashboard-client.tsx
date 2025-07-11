"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, FileText, GitCompare, Download, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PageContainer } from "@/components/page-container";
import { PageTitle } from "@/components/page-title";
import { DashboardStats, DashboardStatsResponse } from "@/types/dashboard";
import { useApiData } from "@/lib/hooks";

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // Use consolidated API data hook
  const { 
    data: stats, 
    loading, 
    error, 
    reload: fetchStats 
  } = useApiData<DashboardStats | null>('/${PROJECT_NAME}/api/dashboard/stats', {
    autoLoad: status === "authenticated",
    transform: (response: DashboardStatsResponse) => response.data || null,
    onError: (error) => {
      toast({
        title: "Error loading statistics",
        description: error.message,
        variant: "destructive"
      });
    },
    deps: [status]
  });

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageTitle description={`Welcome, ${session?.user?.name || "User"}!`}>
          ${PROJECT_DISPLAY_NAME} Dashboard
        </PageTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.documents || 0}</div>
                <p className="text-xs text-muted-foreground">Documents analyzed</p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.comparisons || 0}</div>
                <p className="text-xs text-muted-foreground">NDAs compared</p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.suggestions || 0}</div>
                <p className="text-xs text-muted-foreground">AI suggestions generated</p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Exports</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.exports || 0}</div>
                <p className="text-xs text-muted-foreground">Documents exported</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for NDA analysis</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button 
              className="w-full justify-start" 
              size="lg"
              onClick={() => router.push('/upload')}
            >
              <FileUp className="mr-2 h-5 w-5" />
              Upload NDA Document
            </Button>
            <Button 
              className="w-full justify-start" 
              size="lg" 
              variant="outline"
              onClick={() => router.push('/compare')}
            >
              <GitCompare className="mr-2 h-5 w-5" />
              Compare NDAs
            </Button>
            <Button 
              className="w-full justify-start" 
              size="lg" 
              variant="outline"
              onClick={() => router.push('/documents')}
            >
              <FileText className="mr-2 h-5 w-5" />
              View Documents
            </Button>
            <Button 
              className="w-full justify-start" 
              size="lg" 
              variant="outline"
              onClick={() => {
                toast({
                  title: "Feature coming soon", 
                  description: "Export functionality is being developed."
                })
              }}
            >
              <Download className="mr-2 h-5 w-5" />
              Export Results
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest document analyses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}