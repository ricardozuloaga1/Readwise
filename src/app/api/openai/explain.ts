import { NextResponse } from 'next/server';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Explain the following text: ${text}`,
      max_tokens: 150,
    });

    const explanation = completion.data.choices[0].text?.trim();
    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error fetching explanation:', error);
    return NextResponse.json({ error: 'Failed to fetch explanation' }, { status: 500 });
  }
}