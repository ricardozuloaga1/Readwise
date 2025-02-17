import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface Concept {
  text: string;
  type: string;
  startIndex?: number;
  endIndex?: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to find all occurrences of a phrase in text
function findAllOccurrences(text: string, phrase: string) {
  const indices = [];
  let pos = 0;
  while (true) {
    const index = text.indexOf(phrase, pos);
    if (index === -1) break;
    
    // Check if the match is a whole word/phrase
    const before = index === 0 || /\s/.test(text[index - 1]);
    const after = (index + phrase.length) === text.length || /\s/.test(text[index + phrase.length]);
    
    if (before && after) {
      indices.push({
        startIndex: index,
        endIndex: index + phrase.length
      });
    }
    pos = index + 1;
  }
  return indices;
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a concept identification system. Analyze the provided text and identify important concepts that should be interactive/clickable.

Rules for identification:
1. Identify complete concepts as single units (e.g., "artificial intelligence", "United States of America")
2. Include important contextual words (e.g., "COVID-19 pandemic" not just "COVID-19")
3. Identify technical terms and specialized vocabulary
4. Include full names of people, organizations, and places
5. Capture complete date references and historical events
6. Identify scientific processes and technical concepts as complete phrases
7. Look for key phrases that represent complete ideas

Categorize each identified item as one of:
- ENTITY (for names, places, organizations)
- TERM (for technical/specialized terms)
- EVENT (for historical events, dates)
- CONCEPT (for complex ideas, processes)
- PHRASE (for important multi-word expressions)

Response format:
{
  "concepts": [
    {
      "text": "exact phrase from text",
      "type": "category"
    }
  ]
}

Important: Return EXACT text matches from the original text. Do not modify or paraphrase the identified concepts.`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{"concepts": []}');
    
    // Process each concept to find its occurrences in the text
    const concepts = parsed.concepts.flatMap((concept: Concept) => {
      const occurrences = findAllOccurrences(text, concept.text);
      return occurrences.map(pos => ({
        ...concept,
        ...pos
      }));
    });

    // Sort concepts by length (longest first) to handle overlapping concepts
    concepts.sort((a: Concept, b: Concept) => b.text.length - a.text.length);

    return NextResponse.json({ concepts });
  } catch (error) {
    console.error('Error identifying concepts:', error);
    return NextResponse.json(
      { error: 'Failed to identify concepts' },
      { status: 500 }
    );
  }
} 