import { readFile } from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';

// Configure pdfjs worker - use the version from the package
const pdfjsVersion = '5.4.149'; // Match your package.json version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;

/**
 * Convert PDF pages to high-resolution PNG images using pdfjs-dist
 * This approach uses canvas which requires native bindings, but we'll handle errors gracefully
 */
export async function convertPdfToImages(
  pdfPath: string,
  outputDir?: string
): Promise<Buffer[]> {
  try {
    const pdfBuffer = await readFile(pdfPath);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const imageBuffers: Buffer[] = [];

    // Convert each page to an image
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Set scale for high resolution (2.0 = 200% scale)
      const scale = 2.0;
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Convert canvas to PNG buffer
      const buffer = canvas.toBuffer('image/png');
      imageBuffers.push(buffer);
    }

    if (imageBuffers.length === 0) {
      throw new Error('No pages extracted from PDF');
    }

    return imageBuffers;
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    
    // Check if it's a canvas/native dependency issue
    if (error instanceof Error && (
      error.message.includes('canvas') ||
      error.message.includes('native') ||
      error.message.includes('Cannot find module') ||
      error.message.includes('canvas.node')
    )) {
      throw new Error(
        'PDF conversion requires native canvas dependencies. ' +
        'Please install canvas system dependencies:\n' +
        'macOS: brew install pkg-config cairo pango libpng jpeg giflib librsvg\n' +
        'Then run: npm rebuild canvas\n\n' +
        'Alternatively, convert your PDF to an image (JPG/PNG) and upload that instead.'
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
