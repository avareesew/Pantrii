import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// PDF text extraction using Google Cloud Vision API
async function extractTextFromRecipe(filepath: string, fileType: string): Promise<string> {
  console.log(`Processing ${fileType} file: ${filepath}`);
  
  try {
    if (fileType === 'application/pdf') {
      const fileStats = await import('fs').then(fs => fs.promises.stat(filepath));
      const fileSizeKB = Math.round(fileStats.size / 1024);
      
      // Check if Google Cloud credentials are available
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT_ID) {
        return `PDF file: ${filepath}
File size: ${fileSizeKB}KB

🔧 Google Cloud Vision API Setup Required

To use Google Cloud Vision API for PDF text extraction, you need to:

1. **Create a Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Vision API**
   - Go to APIs & Services > Library
   - Search for "Cloud Vision API" and enable it

3. **Create Service Account**
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Download JSON key file

4. **Set Environment Variables**
   - Set GOOGLE_APPLICATION_CREDENTIALS to path of JSON key file
   - Set GOOGLE_CLOUD_PROJECT_ID to your project ID

5. **Enable Billing** (Required for Vision API)
   - Go to https://console.cloud.google.com/billing/enable?project=1080354160705
   - First 1,000 requests per month are FREE!

6. **Install Dependencies** (already done)
   - @google-cloud/vision package is installed

Once configured, the system will automatically extract text from PDFs using Google's OCR technology.`;
      }
      
      // Initialize Google Cloud Vision client
      const client = new ImageAnnotatorClient();
      
      try {
        // Read the PDF file
        const pdfBuffer = await readFile(filepath);
        
        console.log('Processing PDF with Google Cloud Document AI...');
        console.log('PDF buffer size:', pdfBuffer.length);
        
        // Initialize Document AI client
        const documentClient = new DocumentProcessorServiceClient();
        
        // Use the processor details you provided
        const processorId = '66e01427f25cdda9';
        const location = 'us';
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        
        const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
        
        console.log('Using Document AI processor:', name);
        
        // Process the PDF with Document AI
        const [result] = await documentClient.processDocument({
          name,
          rawDocument: {
            content: pdfBuffer,
            mimeType: 'application/pdf',
          },
        });
        
        console.log('Document AI result:', JSON.stringify(result, null, 2));
        
        const extractedText = result.document?.text || '';
        
        if (extractedText) {
          console.log(`PDF text extracted: ${extractedText.length} characters`);
          return `PDF file: ${filepath}
File size: ${fileSizeKB}KB

✅ EXTRACTED TEXT (via Google Cloud Document AI):
${extractedText}

Note: This text was extracted using Google Cloud Document AI, which is specifically designed for PDF document processing.`;
        } else {
          return `PDF file: ${filepath}
File size: ${fileSizeKB}KB

No text could be extracted from this PDF using Google Cloud Document AI.

This could be because:
- The PDF contains only images (scanned document)
- The PDF is password protected
- The PDF has complex formatting
- The Document AI processor needs configuration

Try with a different PDF or check the Document AI processor setup.`;
        }
      } catch (error) {
        console.error('PDF processing error:', error);
        return `PDF file: ${filepath}
File size: ${fileSizeKB}KB

Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}

The PDF processing encountered an issue. This could be because:
- Document AI API is not enabled
- Processor ID is not configured
- The PDF format is not supported
- The PDF is corrupted or password protected

Check your Document AI setup and try again.`;
      }
    } else {
      // For image files, use Google Cloud Vision API for OCR
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT_ID) {
        return `Image file detected: ${filepath}\n\nNote: OCR text extraction requires Google Cloud Vision API setup. Please configure the API credentials as described above.`;
      }
      
      const client = new ImageAnnotatorClient();
      const imageBuffer = await readFile(filepath);
      
      const [result] = await client.textDetection({
        image: {
          content: imageBuffer,
        },
      });
      
      const extractedText = result.textAnnotations?.[0]?.description || '';
      
      if (extractedText) {
        return `Image file: ${filepath}

✅ EXTRACTED TEXT (via Google Cloud Vision API):
${extractedText}

Note: This text was extracted using Google Cloud Vision API OCR.`;
      } else {
        return `Image file: ${filepath}\n\nNo text could be extracted from this image using Google Cloud Vision API.`;
      }
    }
  } catch (error) {
    console.error('Error processing file:', error);
    return `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Function to parse any text and extract structured data
function parseRecipeContent(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Extract title (first non-empty line or "Document")
  const title = lines[0] || 'Document';
  
  // Try to extract timing information
  const timeMatch = text.match(/Prep Time: (\d+ minutes).*Cook Time: (\d+ minutes).*Serves: (\d+)/);
  const prepTime = timeMatch ? timeMatch[1] : null;
  const cookTime = timeMatch ? timeMatch[2] : null;
  const serves = timeMatch ? timeMatch[3] : null;
  
  // Try to extract ingredients (look for lines starting with - or bullet points)
  const ingredientsStart = lines.findIndex(line => line.toLowerCase().includes('ingredients'));
  const instructionsStart = lines.findIndex(line => line.toLowerCase().includes('instructions'));
  
  let ingredients: string[] = [];
  if (ingredientsStart >= 0 && instructionsStart > ingredientsStart) {
    ingredients = lines
      .slice(ingredientsStart + 1, instructionsStart)
      .filter(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))
      .map(line => line.replace(/^[-•*]\s*/, '').trim());
  }
  
  // Try to extract instructions (numbered steps)
  const nutritionStart = lines.findIndex(line => line.toLowerCase().includes('nutrition'));
  let instructions: string[] = [];
  if (instructionsStart >= 0) {
    const endIndex = nutritionStart > 0 ? nutritionStart : lines.length;
    instructions = lines
      .slice(instructionsStart + 1, endIndex)
      .filter(line => /^\d+\./.test(line))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
  }
  
  // Try to extract nutrition information
  const nutrition: Record<string, string> = {};
  if (nutritionStart >= 0) {
    const nutritionLines = lines
      .slice(nutritionStart + 1)
      .filter(line => line.includes(':') || line.includes('-'))
      .map(line => line.replace(/^-\s*/, '').trim());
    
    nutritionLines.forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        nutrition[key.toLowerCase()] = value;
      }
    });
  }
  
  return {
    title,
    prepTime,
    cookTime,
    serves,
    ingredients,
    instructions,
    nutrition,
    confidence: 0.75 // Lower confidence since we're not doing real OCR
  };
}

export async function POST(request: NextRequest) {
  try {
    const { filename, filepath } = await request.json();

    if (!filename || !filepath) {
      return NextResponse.json({ 
        error: 'Missing filename or filepath' 
      }, { status: 400 });
    }

    // Check if file exists
    if (!existsSync(filepath)) {
      return NextResponse.json({ 
        error: 'File not found' 
      }, { status: 404 });
    }

    // Read file to determine type
    const fileBuffer = await readFile(filepath);
    const fileType = filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    // Extract text using OCR
    const extractedText = await extractTextFromRecipe(filepath, fileType);

    // Parse the recipe content to extract structured data
    const recipeData = parseRecipeContent(extractedText);

    // Return the results
    return NextResponse.json({
      success: true,
      extractedText,
      recipeData,
      filename,
      processedAt: new Date().toISOString(),
      wordCount: extractedText.split(' ').length,
      characterCount: extractedText.length
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' }, 
      { status: 500 }
    );
  }
}
