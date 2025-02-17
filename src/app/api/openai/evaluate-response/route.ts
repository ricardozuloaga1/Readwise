import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is not configured');
    return NextResponse.json(
      { error: 'OpenAI API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const { question, response, context } = await req.json();
    console.log('Processing response for follow-up:', { question, response });

    if (!question || !response || !context) {
      console.error('Missing required fields:', { question, response, context });
      return NextResponse.json(
        { error: 'Question, response, and context are required' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an engaging conversation partner discussing news and current events.
          You will receive:
          1. The original context (article text)
          2. The previous question asked
          3. The user's spoken response
          
          Your task is to:
          1. Process their response and create a meaningful acknowledgment that:
             - References specific points or insights they shared
             - Shows active listening and understanding
             - Validates their perspective or contribution
             - Uses natural, conversational language
             - Connects their response to the broader discussion
          
          2. Generate a natural follow-up question that:
             - Builds on specific points from their response
             - Encourages deeper exploration of their thoughts
             - Maintains a natural conversational flow
             - Avoids generic or disconnected questions
          
          Format your response as JSON:
          {
            "acknowledgment": "A specific, detailed acknowledgment of their response that shows you understood and valued their input",
            "followUpQuestion": "A natural follow-up question that builds directly on what they said"
          }
          
          Example acknowledgment formats:
          - "I see what you mean about [specific point they made]. That's an interesting perspective on..."
          - "Your point about [specific aspect] really highlights..."
          - "I appreciate how you connected [their point] with [broader context]..."
          
          Make the conversation feel like a natural dialogue between interested parties, not an interview or quiz.`
        },
        {
          role: "user",
          content: `Context: ${context}\n\nPrevious Question: ${question}\n\nUser's Response: ${response}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    if (!completion.choices[0].message.content) {
      console.error('Empty response from OpenAI');
      throw new Error('Empty response from OpenAI');
    }

    try {
      const data = JSON.parse(completion.choices[0].message.content);
      console.log('Parsed OpenAI response:', data);
      
      if (!data.acknowledgment || !data.followUpQuestion) {
        console.error('Invalid response format from OpenAI:', data);
        throw new Error('Invalid response format from OpenAI');
      }

      return NextResponse.json(data);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse OpenAI response');
    }
  } catch (error) {
    console.error('Error processing response:', error);
    
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

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process response' },
      { status: 500 }
    );
  }
} 