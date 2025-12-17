/**
 * List available Gemini models for the API key
 */
export async function listAvailableModels(): Promise<string[]> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_API_KEY}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list models: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const models = data.models || [];
    
    // Filter models that support generateContent
    const availableModels = models
      .filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent')
      )
      .map((model: any) => model.name.replace('models/', ''));

    return availableModels;
  } catch (error) {
    console.error('Error listing models:', error);
    throw error;
  }
}

