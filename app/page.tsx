"use client";

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Shield, Zap } from "lucide-react"

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);
  
  // Only show the public page content to unauthenticated users
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">NDA Analyzer</h1>
          <p className="text-xl text-muted-foreground">
            Streamline your NDA review process with AI-powered analysis
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Document Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload and analyze NDA documents with advanced text extraction
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>Secure Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Enterprise-grade security with Azure AD authentication
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 mb-2 text-primary" />
              <CardTitle>AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get intelligent comparisons and suggestions powered by OpenAI
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {status === "unauthenticated" && (
          <div className="text-center">
            <Button onClick={() => router.push("/sign-in")} size="lg">
              Sign in to get started
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}