import { NextRequest, NextResponse } from 'next/server';
import { documentDb, comparisonDb } from '@/lib/nda';
import { config } from '@/lib/config';

// Test endpoint to compare documents without authentication
export async function POST(request: NextRequest) {
  // Only available in development
  if (!config.IS_DEVELOPMENT) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  try {
    const testUser = config.TEST_USER_EMAIL;
    
    // Get documents with extracted text
    const documents = await documentDb.findByUser(testUser);
    const docsWithText = documents.filter(doc => doc.extracted_text);
    
    if (docsWithText.length < 2) {
      return NextResponse.json({
        error: 'Not enough documents with extracted text',
        documentsWithText: docsWithText.length,
        message: 'Need at least 2 documents with extracted text to compare'
      }, { status: 400 });
    }
    
    // Compare the first two documents with text
    const doc1 = docsWithText[0];
    const doc2 = docsWithText[1];
    
    // Perform simple comparison
    const text1 = doc1.extracted_text!;
    const text2 = doc2.extracted_text!;
    
    // Calculate basic statistics
    const stats1 = {
      words: text1.split(/\s+/).filter(w => w.length > 0).length,
      characters: text1.length,
      lines: text1.split('\n').length
    };
    
    const stats2 = {
      words: text2.split(/\s+/).filter(w => w.length > 0).length,
      characters: text2.length,
      lines: text2.split('\n').length
    };
    
    // Find common words
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    const commonWords = new Set([...words1].filter(x => words2.has(x)));
    const uniqueToDoc1 = new Set([...words1].filter(x => !words2.has(x)));
    const uniqueToDoc2 = new Set([...words2].filter(x => !words1.has(x)));
    
    // Calculate similarity score (Jaccard index)
    const union = new Set([...words1, ...words2]);
    const similarityScore = union.size > 0 ? (commonWords.size / union.size) * 100 : 0;
    
    // Find common phrases
    const phrases1 = findPhrases(text1);
    const phrases2 = findPhrases(text2);
    const commonPhrases = phrases1.filter(p => phrases2.includes(p));
    
    return NextResponse.json({
      comparison: {
        doc1: {
          id: doc1.id,
          name: doc1.original_name,
          stats: stats1,
          preview: text1.substring(0, 200) + '...'
        },
        doc2: {
          id: doc2.id,
          name: doc2.original_name,
          stats: stats2,
          preview: text2.substring(0, 200) + '...'
        }
      },
      similarity: {
        score: Math.round(similarityScore * 100) / 100,
        interpretation: similarityScore > 80 ? 'Very Similar' :
                       similarityScore > 60 ? 'Similar' :
                       similarityScore > 40 ? 'Somewhat Similar' :
                       similarityScore > 20 ? 'Different' : 'Very Different'
      },
      analysis: {
        commonWords: commonWords.size,
        uniqueToDoc1: uniqueToDoc1.size,
        uniqueToDoc2: uniqueToDoc2.size,
        totalUniqueWords: union.size,
        commonPhrases: commonPhrases.length,
        sampleCommonWords: Array.from(commonWords).slice(0, 20),
        sampleCommonPhrases: commonPhrases.slice(0, 10)
      },
      differences: {
        wordCount: {
          doc1: stats1.words,
          doc2: stats2.words,
          difference: Math.abs(stats1.words - stats2.words),
          percentDiff: Math.round(Math.abs((stats1.words - stats2.words) / Math.max(stats1.words, stats2.words)) * 10000) / 100
        },
        characterCount: {
          doc1: stats1.characters,
          doc2: stats2.characters,
          difference: Math.abs(stats1.characters - stats2.characters),
          percentDiff: Math.round(Math.abs((stats1.characters - stats2.characters) / Math.max(stats1.characters, stats2.characters)) * 10000) / 100
        }
      }
    });
    
  } catch (error) {
    console.error('Test comparison error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform comparison',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function findPhrases(text: string): string[] {
  const phrases: string[] = [];
  
  // Find common NDA phrases
  const patterns = [
    /confidential information/gi,
    /non-disclosure agreement/gi,
    /proprietary information/gi,
    /shall not disclose/gi,
    /effective date/gi,
    /governing law/gi,
    /in witness whereof/gi,
    /mutual agreement/gi,
    /third party/gi,
    /trade secrets/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      phrases.push(...matches.map(m => m.toLowerCase()));
    }
  });
  
  return [...new Set(phrases)];
}