import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to truncate and clean text
function prepareText(text: string): string {
  // Remove extra whitespace and newlines
  const cleaned = text.replace(/\s+/g, ' ').trim();
  // Truncate to ~4000 characters (leaving room for system prompt)
  return cleaned.slice(0, 4000);
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is not configured');
    return NextResponse.json(
      { error: 'OpenAI API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    console.log('Received request body type:', typeof body);
    
    if (!body || typeof body !== 'object') {
      console.error('Invalid request body format:', body);
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      );
    }

    const { text } = body;

    if (!text || typeof text !== 'string') {
      console.error('Invalid or missing text in request:', { text });
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    // Prepare the text for the API call
    const preparedText = prepareText(text);
    console.log('Prepared text length:', preparedText.length);
    console.log('First 100 chars of prepared text:', preparedText.substring(0, 100));

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using 3.5-turbo instead of GPT-4 for faster response
      messages: [
        {
          role: "system",
          content: `You are an engaging discussion leader who creates interactive learning experiences.
          Analyze the provided text and create:
          1. A brief discussion of the main points (2-3 sentences)
          2. A thought-provoking question that tests understanding
          
          Format your response as JSON:
          {
            "discussion": "Brief discussion of main points",
            "question": "Thought-provoking question"
          }
          
          Make the discussion conversational and engaging, as it will be read aloud.
          The question should require analytical thinking and cannot be answered with a simple yes/no.`
        },
        {
          role: "user",
          content: preparedText
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    if (!response.choices[0].message.content) {
      console.error('Empty response from OpenAI');
      throw new Error('Empty response from OpenAI');
    }

    let data;
    try {
      data = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', response.choices[0].message.content);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
    if (!data.discussion || !data.question) {
      console.error('Invalid response format from OpenAI:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    console.log('Successfully generated discussion:', {
      discussion: data.discussion.substring(0, 100) + '...',
      question: data.question
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating discussion:', error);
    
    // Check if it's an OpenAI API error
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type
      });
      return NextResponse.json(
        { error: `OpenAI API Error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    // If it's a parsing error or other type of error
    const statusCode = error instanceof Error && error.message.includes('Invalid request body') ? 400 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate discussion' },
      { status: statusCode }
    );
  }
} 