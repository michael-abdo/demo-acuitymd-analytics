"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, StatNumber } from "@/components/ui";
import { LoadingCard } from "@/components/ui/loading";
import { FileUp, FileText, GitCompare, Download, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/page-container";
import { PageTitle } from "@/components/page-title";
import { DashboardStats, DashboardStatsResponse } from "@/types/dashboard";
import { useApiData, useBasePath } from "@/lib/hooks";
import { toast } from "@/lib/utils/toast";

export default function DashboardClient() {
  // TODO: Authentication will be handled at page level
  const isAuthenticated = false; // Temporary until proper auth implemented
  const user = { name: "User" }; // Temporary mock
  const router = useRouter();
  const { pagePath } = useBasePath();

  // Use consolidated API data hook
  const { 
    data: stats, 
    loading, 
    error, 
    reload: fetchStats 
  } = useApiData<DashboardStats | null>('/api/dashboard/stats', {
    autoLoad: isAuthenticated,
    transform: (response: DashboardStatsResponse) => response.data || null,
    onError: (error) => {
      // Only show error toast if it's not an auth error
      if (!error.message.includes('401')) {
        toast.error.load("statistics", error.message);
      }
    },
    deps: [isAuthenticated]
  });

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageTitle description={`Welcome, ${user.name}!`}>
          Dashboard
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
              <LoadingCard showDescription={true} />
            ) : (
              <>
                <StatNumber>{stats?.documents || 0}</StatNumber>
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
              <LoadingCard showDescription={true} />
            ) : (
              <>
                <StatNumber>{stats?.comparisons || 0}</StatNumber>
                <p className="text-xs text-muted-foreground">Templates compared</p>
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
              <LoadingCard showDescription={true} />
            ) : (
              <>
                <StatNumber>{stats?.suggestions || 0}</StatNumber>
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
              <LoadingCard showDescription={true} />
            ) : (
              <>
                <StatNumber>{stats?.exports || 0}</StatNumber>
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
            <CardDescription>Common tasks for template analysis</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button 
              className="w-full justify-start" 
              size="lg"
              onClick={() => router.push(pagePath('/upload'))}
            >
              <FileUp className="mr-2 h-5 w-5" />
              Upload Template Document
            </Button>
            <Button 
              className="w-full justify-start" 
              size="lg" 
              variant="outline"
              onClick={() => router.push(pagePath('/compare'))}
            >
              <GitCompare className="mr-2 h-5 w-5" />
              Compare Templates
            </Button>
            <Button 
              className="w-full justify-start" 
              size="lg" 
              variant="outline"
              onClick={() => router.push(pagePath('/documents'))}
            >
              <FileText className="mr-2 h-5 w-5" />
              View Documents
            </Button>
            <Button 
              className="w-full justify-start" 
              size="lg" 
              variant="outline"
              onClick={() => {
                toast.info.custom("Feature coming soon", "Export functionality is being developed.");
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