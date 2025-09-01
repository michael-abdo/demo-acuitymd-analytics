/**
 * Document Upload with Queue
 * Example of minimal queue integration
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { queue } from '@/lib/redis';
import { storageProvider } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Quick file upload (user waits for this - 2-3 seconds)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const key = `documents/${session.user.email}/${Date.now()}-${file.name}`;
    const fileUrl = await storageProvider.upload(key, fileBuffer);

    // Save basic file info to database immediately
    const { executeQuery } = await import('@/lib/template/repositories/base');
    const result = await executeQuery(
      'INSERT INTO documents (filename, file_path, file_size, user_id, status) VALUES (?, ?, ?, ?, ?)',
      [file.name, fileUrl, file.size, session.user.email, 'uploaded']
    );

    const documentId = (result as any).insertId;

    // Queue background processing (user doesn't wait for this)
    await queue.add('process-document', {
      documentId,
      userId: session.user.email,
      fileName: file.name,
      filePath: fileUrl
    });

    // Immediate response to user (3-5 seconds total)
    return Response.json({
      success: true,
      message: 'File uploaded successfully! Processing in background...',
      documentId,
      fileName: file.name,
      estimatedProcessingTime: '2-3 minutes'
    });

  } catch (error) {
    console.error('Upload failed:', error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}