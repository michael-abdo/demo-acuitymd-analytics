"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, FileText, GitCompare, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <main className="container mx-auto py-8 px-4 mt-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">NDA Analyzer Dashboard</h1>
        <p className="text-gray-600">
          Welcome, {session?.user?.name || "User"}!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Documents analyzed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Comparisons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">NDAs compared</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">AI suggestions generated</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Documents exported</p>
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
              onClick={() => {
                toast({
                  title: "Feature coming soon",
                  description: "NDA comparison functionality is being developed."
                })
              }}
            >
              <GitCompare className="mr-2 h-5 w-5" />
              Compare NDAs
            </Button>
            <Button 
              className="w-full justify-start" 
              size="lg" 
              variant="outline"
              onClick={() => {
                toast({
                  title: "Feature coming soon",
                  description: "Document viewer is being developed."
                })
              }}
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
    </main>
  );
}