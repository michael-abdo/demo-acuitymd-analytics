"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { NDADocument, UploadNDAProps } from '@/types/nda'
import { useFileUpload } from '@/lib/hooks'

export function UploadNDA({ onUploadComplete }: UploadNDAProps) {
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<string>('THIRD_PARTY')
  const { toast } = useToast()

  // Use consolidated file upload hook
  const { upload, uploading } = useFileUpload('/nda-analyzer/api/upload', {
    onSuccess: (result) => {
      toast({
        title: "Upload successful",
        description: "Your NDA document has been uploaded successfully."
      });
      
      setFile(null);
      onUploadComplete?.(result.document);
      
      // Reset form
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'text/plain' // .txt
      ]
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, DOCX, DOC, or TXT file.",
          variant: "destructive"
        })
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive"
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('isStandard', docType === 'STANDARD' ? 'true' : 'false')

      await upload(formData)
    } catch (error) {
      // Error handling is done in the hook's onError callback
      console.error('Upload error:', error)
    }
  }

  return (
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
        <div className="space-y-2">
          <Label htmlFor="doc-type">Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STANDARD">Standard NDA</SelectItem>
              <SelectItem value="THIRD_PARTY">Third-Party NDA</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Document File</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                {file ? file.name : 'Click to select a document'}
              </p>
              <p className="text-xs text-gray-400">PDF, DOCX, DOC, or TXT files, max 10MB</p>
            </label>
          </div>
        </div>

        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}