import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Explain the following text: ${text}`
        }
      ],
    });

    const explanation = completion.choices[0].message.content;
    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error('Error fetching explanation:', error);
    
    // Handle specific error cases
    if (error.code === 'unsupported_country_region_territory') {
      return NextResponse.json(
        { 
          error: 'OpenAI services are not available in your region. Please try using a different region or VPN.' 
        }, 
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch explanation' }, 
      { status: 500 }
    );
  }
} 