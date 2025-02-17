import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    try {
      console.log('Attempting to generate flashcards with OpenAI...');
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a flashcard generation system that creates flashcards STRICTLY based on the provided article content.
            Do NOT include any information or knowledge from outside the article.
            
            Rules for flashcard creation:
            1. Card 1: Focus on the main thesis or central topic of the article
            2. Cards 2-3: Cover key supporting points mentioned IN THE ARTICLE
            3. Cards 4-5: Focus on specific details or examples FROM THE ARTICLE
            4. ALL questions and answers must be based on information explicitly stated in the article
            5. Do not include external facts or knowledge not mentioned in the article
            6. Front of card: Clear, specific question about the article content
            7. Back of card: Answer using only information from the article
            8. Keep answers focused and directly related to the questions
            
            Example format:
            Front: "What is the main issue discussed in this article?"
            Back: [Answer using only information from the article]
            
            Return the flashcards in this JSON format:
            {
              "flashcards": [
                {
                  "id": "1",
                  "front": "question about article content",
                  "back": "answer from article content",
                  "category": "main-idea" | "key-point" | "detail"
                }
              ]
            }`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 2000
      });

      console.log('OpenAI response received:', response.choices[0].message);

      if (!response.choices[0].message.content) {
        console.error('No content in OpenAI response');
        throw new Error('No content in OpenAI response');
      }

      try {
        const parsed = JSON.parse(response.choices[0].message.content);
        console.log('Parsed response:', parsed);
        
        // Validate the response format
        if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
          console.error('Invalid response format:', parsed);
          throw new Error('Invalid response format from OpenAI');
        }

        // Ensure each flashcard has required fields
        parsed.flashcards = parsed.flashcards.map((card: any, index: number) => ({
          id: card.id || String(index + 1),
          front: card.front || 'Question not generated',
          back: card.back || 'Answer not generated',
          category: card.category || 'main-idea'
        }));

        return NextResponse.json(parsed);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Raw response content:', response.choices[0].message.content);
        throw new Error('Failed to parse OpenAI response');
      }
    } catch (openaiError: any) {
      console.error('OpenAI API Error:', {
        message: openaiError.message,
        type: openaiError.type,
        stack: openaiError.stack
      });
      
      let errorMessage = 'Error communicating with OpenAI';
      if (openaiError.response?.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (openaiError.response?.status === 401) {
        errorMessage = 'Invalid API key. Please check your configuration.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: openaiError.response?.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('Error processing request:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to generate flashcards: ' + error.message },
      { status: 500 }
    );
  }
} 