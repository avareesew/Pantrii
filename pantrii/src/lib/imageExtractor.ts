import { readFile } from 'fs/promises';
import { extractImageFromPdfWithGemini } from './geminiImageExtractor';

/**
 * Extract image from uploaded file
 * For images: returns the image as base64 data URL
 * For PDFs: tries to extract embedded images using pdfjs-dist, then falls back to Gemini API
 */
export async function extractImageFromFile(
  filepath: string,
  filename: string,
  mimeType: string
): Promise<string | null> {
  try {
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    
    if (isPdf) {
      const pdfBytes = await readFile(filepath);
      
      // Strategy: Use Gemini to identify which page has the image,
      // then try to extract using available tools
      
      // First, try using Gemini to identify the image location
      let targetPage = 1;
      let hasImage = false;
      
      try {
        console.log('Identifying image location using Gemini API...');
        const geminiResult = await extractImageFromPdfWithGemini(pdfBytes);
        
        if (geminiResult) {
          const imageInfo = JSON.parse(geminiResult);
          if (imageInfo.hasImage && imageInfo.pageNumber) {
            targetPage = imageInfo.pageNumber;
            hasImage = true;
            console.log(`Gemini identified a recipe image on page ${targetPage}: ${imageInfo.description}`);
          } else {
            console.log('Gemini confirmed no recipe image in PDF');
            return null;
          }
        }
      } catch (geminiError) {
        console.log('Gemini identification failed, will try to extract from first page:', geminiError);
      }
      
      // Try to extract using Poppler's pdfimages command (if available)
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const path = await import('path');
        const fs = await import('fs/promises');
        const os = await import('os');
        
        // Create a temporary directory for extracted images
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-images-'));
        const outputPattern = path.join(tempDir, 'img-%d');
        
        try {
          // Try pdfimages command (part of Poppler)
          await execAsync(`pdfimages -png "${filepath}" "${outputPattern}"`, {
            timeout: 30000,
          });
          
          // Look for extracted images
          const files = await fs.readdir(tempDir);
          const imageFiles = files
            .filter(f => f.startsWith('img-') && (f.endsWith('.png') || f.endsWith('.jpg')))
            .sort();
          
          if (imageFiles.length > 0) {
            // Use the first image (usually the main recipe image)
            const firstImagePath = path.join(tempDir, imageFiles[0]);
            const imageBuffer = await readFile(firstImagePath);
            const base64 = imageBuffer.toString('base64');
            
            // Clean up temp directory
            await fs.rm(tempDir, { recursive: true, force: true });
            
            console.log(`Successfully extracted image from PDF using Poppler`);
            return `data:image/png;base64,${base64}`;
          }
          
          // Clean up if no images found
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (execError: any) {
          // Clean up on error
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
          
          if (execError.code === 'ENOENT') {
            console.log('Poppler (pdfimages) not found. Image extraction requires Poppler installation.');
            console.log('Install with: brew install poppler (macOS) or apt-get install poppler-utils (Linux)');
          } else {
            throw execError;
          }
        }
      } catch (popplerError) {
        console.log('Poppler extraction failed:', popplerError);
      }
      
      // If all extraction methods fail, return null
      // The user can manually add images later
      if (hasImage) {
        console.log(`Image identified on page ${targetPage} but could not be extracted.`);
        console.log('Install Poppler (brew install poppler) for automatic image extraction.');
      }
      return null;
    } else {
      // For images, read and convert to base64 data URL
      const fileBuffer = await readFile(filepath);
      const base64 = fileBuffer.toString('base64');
      
      // Determine the correct MIME type
      let imageMimeType = 'image/png';
      const lowerFilename = filename.toLowerCase();
      if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg')) {
        imageMimeType = 'image/jpeg';
      } else if (lowerFilename.endsWith('.png')) {
        imageMimeType = 'image/png';
      }
      
      return `data:${imageMimeType};base64,${base64}`;
    }
  } catch (error) {
    console.error('Error extracting image:', error);
    return null;
  }
}

