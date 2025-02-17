import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  question: string;
  correctAnswer: string;
  options?: string[];
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const prompt = `
      Analyze the following text and create a quiz with 5 questions. 

      Requirements:
      1. FIRST question must be about the main topic or central idea of the text
      2. Make it a multiple-choice question with 4 options, where:
         - One option MUST be the exact correct answer (word-for-word match)
         - Other options should be plausible but clearly incorrect
         - Present options in random order
      3. Then create:
         - Another multiple-choice question about a specific detail (following same rules)
         - Two true/false questions about supporting ideas
         - One fill-in-the-blank question about a key term or concept
      
      For multiple choice questions:
      - The correctAnswer must be EXACTLY the same as one of the options (copy-paste the correct option)
      - Include exactly 4 options for each multiple-choice question
      - Make sure options are distinct from each other
      
      For fill-in-blank questions:
      - Use a single word or very short phrase as the answer
      - Make it clear what type of answer is expected
      - Include a blank line (___) in the question text
      - The answer should be a specific term or concept from the text
      - Provide enough context in the question to make the answer clear
      Example: "The process of converting light energy into chemical energy in plants is called ___." (Answer: "photosynthesis")
      
      IMPORTANT:
      - Each question MUST have an 'id' field (q1, q2, q3, q4, q5)
      - Each question MUST have a 'type' field (multiple-choice, true-false, or fill-blank)
      - Each question MUST have a 'question' field with the question text
      - Each question MUST have a 'correctAnswer' field
      - Multiple choice questions MUST have an 'options' array with exactly 4 options
      - True/False questions should have correctAnswer as either "True" or "False"
      - Fill-in-blank questions should have a clear, specific correctAnswer
      
      Format the response as a JSON object with this structure:
      {
        "mainTopic": "Brief description of the text's main topic",
        "questions": [
          {
            "id": "q1",
            "type": "multiple-choice",
            "question": "Clear question text",
            "correctAnswer": "Must match one option exactly",
            "options": ["Four distinct options", "Including", "The exact", "Correct answer"]
          }
        ]
      }

      Text: ${text}
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    const parsedResponse = JSON.parse(response);

    // Ensure questions array exists
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }

    // Add IDs if missing
    const validatedQuestions = parsedResponse.questions.map((q: QuizQuestion, index: number) => {
      const question = { ...q };
      
      // Add ID if missing
      if (!question.id) {
        question.id = `q${index + 1}`;
      }

      // Validate question type
      if (!question.type || !['multiple-choice', 'true-false', 'fill-blank'].includes(question.type)) {
        question.type = 'multiple-choice';
      }

      // Ensure question text exists
      if (!question.question) {
        throw new Error(`Question ${index + 1} is missing question text`);
      }

      // Ensure correct answer exists
      if (!question.correctAnswer) {
        throw new Error(`Question ${index + 1} is missing correct answer`);
      }

      // Handle multiple choice questions
      if (question.type === 'multiple-choice') {
        if (!Array.isArray(question.options) || question.options.length !== 4) {
          throw new Error(`Question ${index + 1} must have exactly 4 options`);
        }
        // Ensure correct answer is in options
        if (!question.options.includes(question.correctAnswer)) {
          question.options[3] = question.correctAnswer;
        }
      }

      // Handle true/false questions
      if (question.type === 'true-false') {
        question.correctAnswer = question.correctAnswer.toLowerCase() === 'true' ? 'True' : 'False';
      }

      return question;
    });

    return NextResponse.json({
      mainTopic: parsedResponse.mainTopic || 'Quiz Topic',
      questions: validatedQuestions
    });
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate quiz. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 