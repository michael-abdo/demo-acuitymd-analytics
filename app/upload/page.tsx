"use client"

import { UploadNDA } from '@/components/upload-nda'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const router = useRouter()

  const handleUploadComplete = (document: any) => {
    console.log('Document uploaded:', document)
    // Could redirect to comparison page or show success state
  }

  return (
    <main className="container mx-auto py-8 px-4 mt-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Upload NDA Document</h1>
          <p className="text-gray-600">
            Upload your NDA documents for analysis and comparison
          </p>
        </div>

        <div className="space-y-6">
          <UploadNDA onUploadComplete={handleUploadComplete} />
          
          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>
                Understanding the NDA analysis process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Upload Documents</h4>
                  <p className="text-sm text-gray-600">
                    Upload your standard NDA and third-party NDAs for comparison
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-medium">AI Analysis</h4>
                  <p className="text-sm text-gray-600">
                    Our AI extracts text and performs detailed comparison analysis
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Get Insights</h4>
                  <p className="text-sm text-gray-600">
                    Receive detailed comparisons and suggested edits for alignment
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}