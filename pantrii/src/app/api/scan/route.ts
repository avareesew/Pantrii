import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hashFile, hashBuffer } from '@/lib/fileHash';
import { getCachedRecipe, saveCachedRecipe } from '@/lib/recipeCache';
import { extractRecipeFromImage } from '@/lib/geminiVision';

/**
 * New scan API using Gemini 1.5 Flash with vision capabilities
 * Supports PDF and image files
 * Implements caching based on file hash
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;

    const { filename, filepath, debug = false } = await request.json();

    if (!filename || !filepath) {
      return NextResponse.json(
        { error: 'Missing filename or filepath' },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check cache first
    const fileHash = await hashFile(filepath);
    const cachedRecipe = await getCachedRecipe(fileHash);

    if (cachedRecipe && !debug) {
      console.log('Returning cached recipe for hash:', fileHash);
      return NextResponse.json({
        success: true,
        recipeData: cachedRecipe,
        filename,
        processedAt: new Date().toISOString(),
        cached: true,
        fileHash,
      });
    }

    // Check if Gemini API key is available
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        {
          error: 'GOOGLE_AI_API_KEY environment variable is not set',
          message: 'Please set your Google AI API key in environment variables',
        },
        { status: 500 }
      );
    }

    const fileBuffer = await readFile(filepath);
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    
    // Determine MIME type
    let mimeType = 'image/png';
    if (isPdf) {
      mimeType = 'application/pdf';
    } else {
      const lowerFilename = filename.toLowerCase();
      if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (lowerFilename.endsWith('.png')) {
        mimeType = 'image/png';
      }
    }

    // Extract recipe directly from PDF or image using Gemini
    // Gemini can handle PDFs natively, so no conversion needed!
    console.log(`Extracting recipe from ${isPdf ? 'PDF' : 'image'} using Gemini 2.5 Flash...`);
    let recipeData;
    
    try {
      recipeData = await extractRecipeFromImage(fileBuffer, mimeType);
    } catch (extractionError) {
      console.error('Recipe extraction error:', extractionError);
      return NextResponse.json(
        {
          error: `Failed to extract recipe from ${isPdf ? 'PDF' : 'image'}`,
          message: extractionError instanceof Error ? extractionError.message : 'Unknown extraction error',
        },
        { status: 500 }
      );
    }

    // Save to cache for future use
    try {
      await saveCachedRecipe(fileHash, recipeData, userId);
      console.log('Recipe saved to cache');
    } catch (cacheError) {
      console.error('Failed to save to cache (non-fatal):', cacheError);
      // Don't fail the request if caching fails
    }

    // Return results
    return NextResponse.json({
      success: true,
      recipeData,
      filename,
      processedAt: new Date().toISOString(),
      cached: false,
      fileHash,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
