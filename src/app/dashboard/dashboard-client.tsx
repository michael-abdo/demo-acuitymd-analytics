"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/ui";
import { FileUp, FileText, GitCompare, Download, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/page-container";
import { PageTitle } from "@/components/page-title";
import { toast } from "@/lib/utils/toast";

export default function DashboardClient() {
  // TODO: Authentication will be handled at page level  
  const user = { name: "User" }; // Temporary mock
  const router = useRouter();

  // Mock data for template - replace with your API calls
  const stats = {
    documents: 12,
    comparisons: 8,
    suggestions: 24,
    exports: 6
  };
  const loading = false;
  
  const fetchStats = () => {
    toast.info("Refresh clicked - implement your data fetching here");
  };

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
            <div className="text-2xl font-bold">{stats.documents}</div>
            <p className="text-xs text-muted-foreground">Documents analyzed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.comparisons}</div>
            <p className="text-xs text-muted-foreground">Templates compared</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suggestions}</div>
            <p className="text-xs text-muted-foreground">AI suggestions generated</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.exports}</div>
            <p className="text-xs text-muted-foreground">Documents exported</p>
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
              onClick={() => router.push('/upload')}
            >
              <FileUp className="mr-2 h-5 w-5" />
              Upload Template Document
            </Button>
            <Button 
              className="w-full justify-start" 
              size="lg" 
              variant="outline"
              onClick={() => router.push('/compare')}
            >
              <GitCompare className="mr-2 h-5 w-5" />
              Compare Templates
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
                toast.info("Feature coming soon - Export functionality is being developed.");
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