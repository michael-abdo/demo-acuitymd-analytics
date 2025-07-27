"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileText } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading'
import { NDADocument, UploadNDAProps } from '@/types/nda'
import { useFileUpload } from '@/lib/hooks'
import { toast } from '@/lib/utils/toast'
import { FormUtils } from '@/lib/utils'

export function UploadNDA({ onUploadComplete }: UploadNDAProps) {
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<string>('THIRD_PARTY')

  // Use consolidated file upload hook
  const { upload, uploading } = useFileUpload('/api/upload', {
    onSuccess: (result) => {
      toast.success.upload(file?.name);
      
      setFile(null);
      onUploadComplete?.(result.document);
      
      // Reset form
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error) => {
      toast.error.upload(error.message);
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
        toast.warning.fileType(["PDF", "DOCX", "DOC", "TXT"]);
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.warning.noFile();
      return
    }

    try {
      const formData = FormUtils.createUploadFormData(file, {
        isStandard: docType === 'STANDARD'
      })

      await upload(formData)
    } catch (error) {
      // Error handling is done in the hook's onError callback
      // No additional action needed here
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

        <LoadingButton 
          onClick={handleUpload}
          loading={uploading}
          disabled={!file}
          className="w-full"
        >
          {!uploading && <Upload className="mr-2 h-4 w-4" />}
          {uploading ? 'Uploading...' : 'Upload Document'}
        </LoadingButton>
      </CardContent>
    </Card>
  )
}