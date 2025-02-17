import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { questions, mainTopic } = await req.json();

    const prompt = `
      Analyze these incorrect quiz answers about "${mainTopic}" and provide a helpful explanation.
      
      Questions and Answers:
      ${questions.map((q: any, index: number) => `
        ${index + 1}. Question: ${q.question}
           User's Answer: ${q.userAnswer}
           Correct Answer: ${q.correctAnswer}
           Type: ${q.type}
      `).join('\n')}

      Please provide:
      1. A brief explanation for each incorrect answer
      2. Any patterns in the mistakes
      3. Key concepts the user should review
      4. A positive encouragement for improvement

      Format the response in clear paragraphs with line breaks between sections.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
    });

    return NextResponse.json({
      explanation: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('Error explaining quiz results:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz explanation' },
      { status: 500 }
    );
  }
} 