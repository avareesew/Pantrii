/**
 * Extract recipe images from PDFs using Gemini API
 * Note: Gemini cannot directly return binary image data, but it can help identify
 * if images exist and on which pages. This function uses Gemini to verify image presence.
 * 
 * For actual extraction, we rely on pdfjs-dist in the main extractImageFromFile function.
 * This Gemini function serves as a fallback/verification method.
 */

/**
 * Ask Gemini to identify if there are recipe images in the PDF
 * Returns information about image presence (though Gemini can't return the actual image data)
 */
export async function extractImageFromPdfWithGemini(
  pdfBuffer: Buffer
): Promise<string | null> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
  }

  const base64Pdf = pdfBuffer.toString('base64');

  const prompt = `This PDF contains a recipe. Please analyze it and tell me:

1. Does this PDF contain a recipe image (a photo of the finished dish/food)?
2. If yes, on which page number is the main recipe image located?
3. Describe the image briefly (e.g., "photo of chocolate cake on page 1")

Return your answer in this exact JSON format:
{
  "hasImage": true/false,
  "pageNumber": number or null,
  "description": "brief description or null"
}

If there is no recipe image, set hasImage to false.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: 'application/pdf',
                    data: base64Pdf,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error for image identification:', errorText);
      return null;
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
      console.error('Invalid Gemini API response structure for image identification');
      return null;
    }
    
    const responseText = data.candidates[0].content.parts[0].text.trim();
    
    try {
      const imageInfo = JSON.parse(responseText);
      
      if (imageInfo.hasImage && imageInfo.pageNumber) {
        console.log(`Gemini identified a recipe image on page ${imageInfo.pageNumber}: ${imageInfo.description}`);
        // Return the page number so the caller can extract from that specific page
        return JSON.stringify({
          hasImage: true,
          pageNumber: imageInfo.pageNumber,
          description: imageInfo.description
        });
      } else {
        console.log('Gemini confirmed no recipe image in PDF');
        return null;
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error identifying image in PDF with Gemini:', error);
    return null;
  }
}

