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
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !process.env.GOOGLE_CLOUD_PROJECT_ID) {
        return `PDF file: ${filepath}
File size: ${fileSizeKB}KB

🔧 Google Cloud API Setup Required

To use Google Cloud Document AI for PDF text extraction, you need to:

1. **Create a Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Document AI API**
   - Go to APIs & Services > Library
   - Search for "Document AI API" and enable it

3. **Create Service Account**
   - Go to IAM & Admin > Service Accounts
   - Create new service account with Document AI permissions
   - Download JSON key file

4. **Set Environment Variables**
   - Set GOOGLE_APPLICATION_CREDENTIALS to path of JSON key file
   - Set GOOGLE_CLOUD_PROJECT_ID to your project ID

5. **Enable Billing** (Required for Document AI)
   - Go to https://console.cloud.google.com/billing/enable
   - First 1,000 requests per month are FREE!

6. **Create Document AI Processor**
   - Go to Document AI > Processors
   - Create a new processor for document parsing
   - Note the processor ID for configuration

Once configured, the system will automatically extract text from PDFs using Google's Document AI technology.`;
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
          return extractedText;
        } else {
          return `No text could be extracted from this PDF using Google Cloud Document AI.

This could be because:
- The PDF contains only images (scanned document)
- The PDF is password protected
- The PDF has complex formatting
- The Document AI processor needs configuration

Try with a different PDF or check the Document AI processor setup.`;
        }
      } catch (error) {
        console.error('PDF processing error:', error);
        
        // Check if it's a permission/billing issue
        if (error instanceof Error && error.message.includes('PERMISSION_DENIED')) {
          return `❌ Google Cloud API Error: ${error.message}

The Google Cloud project appears to be suspended or billing is not enabled. To fix this:

1. **Check Billing Status**
   - Go to https://console.cloud.google.com/billing
   - Ensure billing is enabled for your project

2. **Verify Project Status**
   - Go to https://console.cloud.google.com/
   - Check if your project is active and not suspended

3. **Update Credentials**
   - Verify GOOGLE_APPLICATION_CREDENTIALS points to a valid key file
   - Ensure GOOGLE_CLOUD_PROJECT_ID is set correctly

4. **Alternative: Use Basic Text Extraction**
   - For now, you can manually copy text from the PDF
   - The system will parse it once you paste it

Once the Google Cloud issues are resolved, PDF scanning will work automatically.`;
        }
        
        return `Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}

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
        return `Image file detected.\n\nNote: OCR text extraction requires Google Cloud Vision API setup. Please configure the API credentials as described above.`;
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
        return extractedText;
      } else {
        return `No text could be extracted from this image using Google Cloud Vision API.`;
      }
    }
  } catch (error) {
    console.error('Error processing file:', error);
    return `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Function to clean and deduplicate ingredients
function cleanIngredients(ingredients: string[]): string[] {
  const cleaned = ingredients
    .map(ingredient => {
      // Remove emojis and special characters, keep alphanumeric, spaces, /, ., -, and %
      return ingredient
        .replace(/[^\w\s\/\.\-\%]/g, '') // Allow percentage signs
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    })
    .filter(ingredient => ingredient.length > 0) // Remove empty strings
    .map(ingredient => {
      // Remove common prefixes that might be duplicated
      return ingredient
        .replace(/^(ingredients?|ingredient)\s*/i, '')
        .replace(/^[-•*]\s*/, '')
        .trim();
    })
    .filter(ingredient => ingredient.length > 0);
  
  // Better deduplication logic
  const uniqueIngredients: string[] = [];
  const seenIngredients = new Set<string>();
  
  for (const ingredient of cleaned) {
    // Normalize ingredient for comparison (lowercase, remove extra spaces)
    const normalized = ingredient.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Skip if we've seen this exact ingredient
    if (seenIngredients.has(normalized)) {
      continue;
    }
    
    // Skip if this ingredient is a subset of an existing one
    const isSubset = uniqueIngredients.some(existing => {
      const existingNormalized = existing.toLowerCase();
      return existingNormalized.includes(normalized) && existingNormalized !== normalized;
    });
    
    if (isSubset) {
      continue;
    }
    
    // Skip if this ingredient contains an existing one (avoid partial ingredients)
    const containsExisting = uniqueIngredients.some(existing => {
      const existingNormalized = existing.toLowerCase();
      return normalized.includes(existingNormalized) && normalized !== existingNormalized;
    });
    
    if (containsExisting) {
      // Remove the shorter ingredient and add the longer one
      const filtered = uniqueIngredients.filter(existing => {
        const existingNormalized = existing.toLowerCase();
        return !normalized.includes(existingNormalized) || normalized === existingNormalized;
      });
      uniqueIngredients.length = 0;
      uniqueIngredients.push(...filtered);
    }
    
    // Skip very short ingredients that are likely fragments
    if (ingredient.length < 3) {
      continue;
    }
    
    // Skip ingredients that are just measurements without food items
    if (/^\d+[\s\/\d]*\s*(tsp|tbsp|cup|cups|lb|lbs|oz|gram|grams|g|kg|ml|liter|liters|%|percent)$/i.test(ingredient)) {
      continue;
    }
    
    // Remove writer's notes and personal comments
    let cleanIngredient = ingredient;
    
    // Remove common writer's note patterns
    const notePatterns = [
      /\s+i\s+like\s+[^,]+/i,  // "I like Mike's Hot Honey"
      /\s+preferably\s+[^,]+/i,  // "preferably organic"
      /\s+preferred\s+[^,]+/i,   // "preferred brand"
      /\s+optional\s*[^,]*/i,    // "optional"
      /\s+as\s+needed\s*[^,]*/i,  // "as needed"
      /\s+or\s+to\s+preference\s*[^,]*/i,  // "or to preference"
      /\s+\([^)]*note[^)]*\)/i,   // "(note: ...)"
      /\s+\([^)]*prefer[^)]*\)/i, // "(prefer ...)"
      /\s+\([^)]*like[^)]*\)/i,   // "(like ...)"
      /\s+\([^)]*optional[^)]*\)/i, // "(optional ...)"
      /\s+\([^)]*suggest[^)]*\)/i, // "(suggest ...)"
      /\s+\([^)]*recommend[^)]*\)/i, // "(recommend ...)"
    ];
    
    for (const pattern of notePatterns) {
      cleanIngredient = cleanIngredient.replace(pattern, '').trim();
    }
    
    // Skip if ingredient becomes too short after removing notes
    if (cleanIngredient.length < 3) {
      continue;
    }
    
    // Update the normalized version for comparison
    const cleanNormalized = cleanIngredient.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Skip if we've seen this cleaned ingredient
    if (seenIngredients.has(cleanNormalized)) {
      continue;
    }
    
    uniqueIngredients.push(cleanIngredient);
    seenIngredients.add(cleanNormalized);
  }
  
  // Sort alphabetically for better organization
  return uniqueIngredients.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

// Function to clean instructions
function cleanInstructions(instructions: string[]): string[] {
  const cleaned = instructions
    .map(instruction => {
      // Remove emojis and special characters, keep alphanumeric, spaces, /, ., -, and %
      return instruction
        .replace(/[^\w\s\/\.\-\%]/g, '') // Allow percentage signs
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    })
    .filter(instruction => instruction.length > 0) // Remove empty strings
    .map(instruction => {
      // Remove common prefixes
      return instruction
        .replace(/^(instructions?|instruction|steps?|step)\s*/i, '')
        .replace(/^\d+\.\s*/, '') // Remove step numbers
        .replace(/^[-•*]\s*/, '')
        .trim();
    })
    .filter(instruction => instruction.length > 0);
  
  return cleaned;
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
  
  // Enhanced ingredient detection based on cooking measurements and units
  const measurementPatterns = [
    // Volume measurements
    /\b\d+\/\d+\s*(cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|ml|milliliter|milliliters|liter|liters|fl\s*oz|fluid\s*ounce|fluid\s*ounces)\b/i,
    // Weight measurements  
    /\b\d+\/\d+\s*(pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kg|kilogram|kilograms)\b/i,
    // Common fractions and numbers with units
    /\b\d+\/\d+\s*(cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|pound|pounds|lb|lbs|ounce|ounces|oz)\b/i,
    // Decimal numbers with units
    /\b\d+\.\d+\s*(cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g)\b/i,
    // Whole numbers with units
    /\b\d+\s*(cup|cups|tablespoon|tablespoons|tbsp|tsp|teaspoon|teaspoons|pound|pounds|lb|lbs|ounce|ounces|oz|gram|grams|g|kg|kilogram|kilograms|ml|milliliter|milliliters|liter|liters)\b/i,
    // Common cooking terms that indicate ingredients
    /\b(pinch|dash|sprinkle|handful|bunch|clove|cloves|slice|slices|piece|pieces|whole|halved|quartered|diced|chopped|minced|grated|shredded)\b/i,
    // Specific ingredient indicators
    /\b(salt|pepper|sugar|flour|butter|oil|garlic|onion|cheese|milk|cream|egg|eggs|chicken|beef|pork|fish|vegetable|fruit|herb|spice)\b/i
  ];
  
  // Function to check if a line contains measurement patterns
  function isIngredientLine(line: string): boolean {
    return measurementPatterns.some(pattern => pattern.test(line));
  }
  
  // Extract ingredients using measurement-based detection
  let ingredients: string[] = [];
  
  // First, try to find ingredients section if it exists
  const ingredientsStart = lines.findIndex(line => line.toLowerCase().includes('ingredients'));
  const instructionsStart = lines.findIndex(line => line.toLowerCase().includes('instructions'));
  
  if (ingredientsStart >= 0 && instructionsStart > ingredientsStart) {
    // If we have clear sections, use the section-based approach
    ingredients = lines
      .slice(ingredientsStart + 1, instructionsStart)
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
  } else {
    // Fallback: scan all lines for measurement patterns
    ingredients = lines
      .filter(line => isIngredientLine(line))
      .map(line => line.replace(/^[-•*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }
  
  // Clean and deduplicate ingredients
  ingredients = cleanIngredients(ingredients);
  
  // Enhanced instruction detection
  const instructionPatterns = [
    /^\d+\./,  // Numbered steps (1., 2., etc.)
    /^(step|steps)\s*\d+/i,  // "Step 1", "Steps 1"
    /^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)/i,  // Ordinal words
    /^(preheat|heat|mix|stir|add|combine|blend|whisk|beat|fold|pour|place|put|set|remove|take|get|cut|slice|chop|dice|mince|grate|shred|bake|roast|fry|sauté|boil|simmer|cook|grill|broil)/i  // Cooking action words
  ];
  
  // Function to check if a line contains instruction patterns
  function isInstructionLine(line: string): boolean {
    return instructionPatterns.some(pattern => pattern.test(line));
  }
  
  // Extract instructions
  let instructions: string[] = [];
  
  if (instructionsStart >= 0) {
    // If we have an instructions section, use it
    const nutritionStart = lines.findIndex(line => line.toLowerCase().includes('nutrition'));
    const endIndex = nutritionStart > 0 ? nutritionStart : lines.length;
    instructions = lines
      .slice(instructionsStart + 1, endIndex)
      .filter(line => line.length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
  } else {
    // Fallback: find lines that look like instructions
    instructions = lines
      .filter(line => isInstructionLine(line))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
  }
  
  // Clean instructions
  instructions = cleanInstructions(instructions);
  
  // Try to extract nutrition information
  const nutritionStart = lines.findIndex(line => line.toLowerCase().includes('nutrition'));
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
    confidence: 0.85 // Higher confidence with measurement-based detection
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
