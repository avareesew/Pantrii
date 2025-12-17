import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { listAvailableModels } from '@/lib/listGeminiModels';

/**
 * API endpoint to list available Gemini models
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_AI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const models = await listAvailableModels();

    return NextResponse.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (error) {
    console.error('Error listing models:', error);
    return NextResponse.json(
      {
        error: 'Failed to list models',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

