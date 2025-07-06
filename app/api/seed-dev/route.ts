import { NextRequest, NextResponse } from 'next/server';
import { FileValidation } from '@/lib/utils';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { NDADocument } from '@/types/nda';

export async function POST(request: NextRequest) {
  // Only work in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const seedUser = process.env.DEV_SEED_USER || 'michaelabdo@vvgtruck.com';
    
    // Initialize or access the global memory store
    if (!(global as any)._ndaMemoryStore) {
      (global as any)._ndaMemoryStore = {
        documents: new Map(),
        comparisons: new Map(),
        exports: new Map(),
        queue: new Map(),
        nextId: {
          documents: 1,
          comparisons: 1,
          exports: 1,
          queue: 1
        }
      };
    }

    const memoryStore = (global as any)._ndaMemoryStore;

    // Clear existing documents for this user
    const existingDocs = (Array.from(memoryStore.documents.values()) as NDADocument[])
      .filter((doc: NDADocument) => doc.user_id === seedUser);
    
    for (const doc of existingDocs) {
      memoryStore.documents.delete((doc as NDADocument).id);
    }

    const documents = [
      { path: 'documents/vvg/Form NDA [Mutual].docx', displayName: 'VVG Standard Mutual NDA', isStandard: true },
      { path: 'documents/vvg/Form NDA [Velocity as Disclosing Party].docx', displayName: 'VVG Disclosing Party NDA', isStandard: true },
      { path: 'documents/third-party/UK-Government-Mutual-NDA.pdf', displayName: 'UK Government Mutual NDA', isStandard: false },
      { path: 'documents/third-party/Sample-Tech-Company-Mutual-NDA.txt', displayName: 'Tech Company Mutual NDA', isStandard: false },
    ];

    let seededCount = 0;

    for (const doc of documents) {
      const filePath = path.resolve(doc.path);
      
      if (!fs.existsSync(filePath)) {
        continue; // Skip missing files
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
      const fileName = path.basename(filePath);
      
      const documentId = memoryStore.nextId.documents++;
      
      const document = {
        id: documentId,
        filename: `${seedUser}/${fileHash}/${fileName}`,
        original_name: fileName,
        display_name: doc.displayName,
        file_hash: fileHash,
        s3_url: `local://${seedUser}/${fileHash}/${fileName}`,
        file_size: fileBuffer.length,
        upload_date: new Date(),
        user_id: seedUser,
        status: 'UPLOADED',
        extracted_text: null,
        is_standard: doc.isStandard,
        content_type: FileValidation.getContentType(fileName),
        metadata: {
          docType: doc.isStandard ? 'STANDARD' : 'THIRD_PARTY',
          contentType: FileValidation.getContentType(fileName),
          provider: 'local'
        }
      };

      memoryStore.documents.set(documentId, document);
      seededCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${seededCount} documents for ${seedUser}`,
      seedUser,
      seededCount,
      totalDocuments: memoryStore.documents.size
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Seeding failed',
      message: error.message
    }, { status: 500 });
  }
}