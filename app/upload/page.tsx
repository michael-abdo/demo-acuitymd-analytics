"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui'
import { Upload, FileText } from 'lucide-react'
import { PageContainer } from '@/components/page-container'
import { PageTitle } from '@/components/page-title'

export default function UploadPage() {
  // Simplified upload page to avoid circular dependencies
  // In a real implementation, this would handle file uploads

  return (
    <PageContainer>
      <PageTitle description="Upload your NDA documents for analysis and comparison">
        Upload NDA Document
      </PageTitle>

        <div className="space-y-6">
          {/* Simplified Upload Component */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload NDA Document
              </CardTitle>
              <CardDescription>
                Upload a PDF or Word document to analyze and compare against your standard NDA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">Template is ready for implementation</p>
                <p className="text-sm text-gray-500 mb-4">Authentication is disabled to avoid circular dependencies</p>
                <Button disabled>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document (Authentication Required)
                </Button>
              </div>
            </CardContent>
          </Card>
          
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
    </PageContainer>
  )
}