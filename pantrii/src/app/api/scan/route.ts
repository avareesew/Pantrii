import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hashFile, hashBuffer } from '@/lib/fileHash';
import { getCachedRecipe } from '@/lib/recipeCache';
import { extractRecipeFromImage } from '@/lib/geminiVision';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * New scan API using Gemini models with vision capabilities
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
      // Get the image from the cached recipe if it exists
      const cachedRecipeWithImage = await prisma.recipe.findFirst({
        where: { fileHash },
        select: { image: true },
      });
      
      // Get the original file from cached recipe if it exists
      const cachedRecipeWithFile = await prisma.recipe.findFirst({
        where: { fileHash },
        select: { originalFile: true, originalFileName: true, originalFileType: true },
      });
      
      return NextResponse.json({
        success: true,
        recipeData: cachedRecipe,
        image: cachedRecipeWithImage?.image || null,
        filename,
        originalFile: cachedRecipeWithFile?.originalFile || null,
        originalFileName: cachedRecipeWithFile?.originalFileName || filename,
        originalFileType: cachedRecipeWithFile?.originalFileType || null,
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
    console.log(`Extracting recipe from ${isPdf ? 'PDF' : 'image'} using Gemini models...`);
    let recipeData;
    
    try {
      recipeData = await extractRecipeFromImage(fileBuffer, mimeType);
    } catch (extractionError) {
      console.error('Recipe extraction error:', extractionError);
      const errorMessage = extractionError instanceof Error ? extractionError.message : 'Unknown extraction error';
      
      // Check if it's specifically about missing instructions
      if (errorMessage.includes('instructions') || errorMessage.includes('Instructions')) {
        return NextResponse.json(
          {
            error: 'Failed to upload recipe',
            message: 'The recipe document does not contain cooking instructions. All recipes must include step-by-step instructions. Please ensure your document includes instructions and try again.',
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        {
          error: `Failed to extract recipe from ${isPdf ? 'PDF' : 'image'}`,
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    // Note: We don't save recipes automatically here
    // Recipes are only saved when the user explicitly clicks "Save Recipe"
    // The cache check above (getCachedRecipe) will find recipes that were previously saved

    // Convert file to base64 for storage/display
    const base64File = fileBuffer.toString('base64');
    const base64DataUri = `data:${mimeType};base64,${base64File}`;

    // Return results
    // Log AI estimation flags for debugging
    if (recipeData.nutrition_ai_estimated) {
      console.log('AI-estimated nutrition:', {
        ai_estimated: recipeData.nutrition_ai_estimated,
        servings_used: recipeData.nutrition_servings_used,
        nutrition: recipeData.nutrition
      });
    }
    
    return NextResponse.json({
      success: true,
      recipeData,
      image: null, // Image extraction removed for simplicity
      filename,
      originalFile: base64DataUri, // Original file as base64
      originalFileName: filename,
      originalFileType: mimeType,
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
