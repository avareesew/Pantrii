import { readFile } from 'fs/promises';

/**
 * Convert PDF pages to high-resolution PNG images
 * Note: PDF conversion requires native bindings that may not work in all environments
 * For now, this is a placeholder that will throw an error with helpful message
 */
export async function convertPdfToImages(
  pdfPath: string,
  outputDir?: string
): Promise<Buffer[]> {
  // Try to use pdf-img-convert if available, otherwise provide helpful error
  try {
    // Dynamic import to avoid bundling issues
    const pdfImgConvert = await import('pdf-img-convert');
    const pdfBuffer = await readFile(pdfPath);

    // Use the convert function from pdf-img-convert
    const convert = pdfImgConvert.convert || (pdfImgConvert as any).default?.convert;
    
    if (!convert) {
      throw new Error('PDF conversion library not properly loaded');
    }

    const imageArray = await convert(pdfBuffer, {
      width: 2000, // High resolution
      height: 2000,
      page_numbers: [], // Convert all pages
      base64: false, // Return as buffer
    });

    if (imageArray.length === 0) {
      throw new Error('No pages extracted from PDF');
    }

    // Convert Uint8Array to Buffer
    return imageArray.map((img: any) => Buffer.from(img));
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    
    // Provide helpful error message
    if (error instanceof Error && error.message.includes('canvas')) {
      throw new Error(
        'PDF conversion requires native dependencies. ' +
        'Please ensure canvas package is properly installed. ' +
        'For now, please use image files (JPG, PNG) instead of PDFs, or install canvas dependencies.'
      );
    }
    
    throw new Error(
      `Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Process multiple images and extract recipe data
 * Combines all pages into a single recipe extraction
 */
export async function processPdfPages(
  imageBuffers: Buffer[],
  extractFunction: (buffer: Buffer, mimeType?: string) => Promise<any>
): Promise<any> {
  // For multi-page PDFs, we'll process the first page
  // In the future, we could combine multiple pages or process them separately
  if (imageBuffers.length === 0) {
    throw new Error('No images to process');
  }

  // Use the first page for now
  // TODO: Could combine multiple pages or process separately
  return extractFunction(imageBuffers[0], 'image/png');
}
