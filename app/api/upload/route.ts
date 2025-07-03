import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const docType = formData.get('docType') as string || 'THIRD_PARTY'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Generate file hash
    const fileHash = createHash('sha256').update(buffer).digest('hex')
    
    // Generate S3 key
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const folderPrefix = process.env.S3_FOLDER_PREFIX || 'nda-analyzer/'
    const s3Key = `${folderPrefix}users/${session.user.email}/documents/${fileHash}/${file.name}`

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'vvg-cloud-storage',
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedBy: session.user.email,
        docType: docType,
        fileHash: fileHash
      }
    })

    await s3Client.send(uploadCommand)

    // TODO: Store document metadata in database (pending schema creation)
    const documentData = {
      filename: s3Key,
      originalName: file.name,
      fileHash: fileHash,
      s3Url: `s3://${process.env.S3_BUCKET_NAME || 'vvg-cloud-storage'}/${s3Key}`,
      fileSize: file.size,
      userId: session.user.email,
      docType: docType,
      status: 'uploaded'
    }

    return NextResponse.json({
      status: 'success',
      message: 'Document uploaded successfully',
      document: documentData
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Upload failed',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}