import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = process.env.DEEPGRAM_API_KEY;
    
    if (!key) {
      console.error('Deepgram API key not found in environment variables');
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }

    console.log('Deepgram API key found:', key.substring(0, 8) + '...');
    return NextResponse.json({ key });
  } catch (error) {
    console.error('Error in Deepgram API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 