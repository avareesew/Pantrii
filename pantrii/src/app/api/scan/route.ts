import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hashFile, hashBuffer } from '@/lib/fileHash';
import { getCachedRecipe, saveCachedRecipe } from '@/lib/recipeCache';
import { extractRecipeFromImage } from '@/lib/geminiVision';
import { convertPdfToImages } from '@/lib/pdfConverter';

/**
 * New scan API using Gemini 1.5 Flash with vision capabilities
 * Supports PDF and image files
 * Implements caching based on file hash
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    let imageBuffers: Buffer[] = [];
    let mimeType = 'image/png';

    // Convert PDF to images or use image directly
    if (isPdf) {
      try {
        console.log('Converting PDF to images...');
        imageBuffers = await convertPdfToImages(filepath);
        if (imageBuffers.length === 0) {
          return NextResponse.json(
            { 
              error: 'PDF conversion failed',
              message: 'No pages could be extracted from the PDF. Please try converting the PDF to an image first, or ensure PDF conversion dependencies are installed.'
            },
            { status: 500 }
          );
        }
        mimeType = 'image/png';
      } catch (pdfError) {
        console.error('PDF conversion error:', pdfError);
        const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown PDF conversion error';
        return NextResponse.json(
          { 
            error: 'PDF conversion not available',
            message: errorMessage + ' For now, please upload recipe images (JPG, PNG) instead of PDFs, or install the required dependencies.',
            suggestion: 'Convert your PDF to an image (JPG or PNG) and upload that instead'
          },
          { status: 500 }
        );
      }
    } else {
      // Determine MIME type for image files
      const lowerFilename = filename.toLowerCase();
      if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (lowerFilename.endsWith('.png')) {
        mimeType = 'image/png';
      }
      imageBuffers = [fileBuffer];
    }

    // Extract recipe from first image (or combine multiple pages)
    console.log('Extracting recipe using Gemini 1.5 Flash...');
    let recipeData;
    
    try {
      if (imageBuffers.length === 1) {
        // Single page/image
        recipeData = await extractRecipeFromImage(imageBuffers[0], mimeType);
      } else {
        // Multi-page PDF - process first page for now
        // TODO: Could combine multiple pages or process separately
        console.log(`Processing first page of ${imageBuffers.length} page PDF`);
        recipeData = await extractRecipeFromImage(imageBuffers[0], mimeType);
      }
    } catch (extractionError) {
      console.error('Recipe extraction error:', extractionError);
      return NextResponse.json(
        {
          error: 'Failed to extract recipe from image',
          message: extractionError instanceof Error ? extractionError.message : 'Unknown extraction error',
        },
        { status: 500 }
      );
    }

    // Save to cache for future use
    try {
      await saveCachedRecipe(fileHash, recipeData, session.user.id);
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
      pagesProcessed: imageBuffers.length,
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
