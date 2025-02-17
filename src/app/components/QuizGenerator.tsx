'use client';

import { useState, useCallback } from 'react';
import { BookOpenIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { saveQuizResult } from '@/lib/firebase/firebaseUtils';
import { useAuth } from '@/lib/hooks/useAuth';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  question: string;
  correctAnswer: string;
  options?: string[];
  userAnswer?: string;
  explanation?: string;
}

interface QuizGeneratorProps {
  articleText: string;
  highlightedText?: string;
  onQuizComplete?: () => void;
}

interface QuizResponse {
  mainTopic: string;
  questions: Question[];
}

export default function QuizGenerator({ articleText, highlightedText, onQuizComplete }: QuizGeneratorProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mainTopic, setMainTopic] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizSummary, setQuizSummary] = useState<string>('');
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuiz = useCallback(async () => {
    if (!articleText && !highlightedText) {
      setError('Please provide some text to generate a quiz.');
      return;
    }

    setIsGenerating(true);
    setShowSummary(false);
    setError(null);

    try {
      const response = await fetch('/api/openai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: highlightedText || articleText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data: QuizResponse = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid quiz data received');
      }

      setQuestions(data.questions);
      setMainTopic(data.mainTopic || '');
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  }, [articleText, highlightedText]);

  const generateQuizSummary = async () => {
    const incorrectAnswers = questions.filter(
      q => q.userAnswer !== q.correctAnswer
    );

    if (incorrectAnswers.length === 0) {
      setQuizSummary("Congratulations! You got all questions correct!");
      setShowSummary(true);
      return;
    }

    try {
      const response = await fetch('/api/openai/explain-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: incorrectAnswers.map(q => ({
            question: q.question,
            correctAnswer: q.correctAnswer,
            userAnswer: q.userAnswer,
            type: q.type,
          })),
          mainTopic,
        }),
      });

      const data = await response.json();
      setQuizSummary(data.explanation);
    } catch (error) {
      console.error('Error generating summary:', error);
      setQuizSummary('Failed to generate summary.');
    }
    setShowSummary(true);
  };

  const handleAnswerSelect = useCallback((questionId: string, answer: string) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, userAnswer: answer } : q
    ));
  }, []);

  const checkAnswerCorrectness = useCallback((question: Question) => {
    if (!question.userAnswer) return false;
    
    if (question.type === 'fill-blank') {
      const userAnswer = question.userAnswer.trim().toLowerCase();
      const correctAnswer = question.correctAnswer.trim().toLowerCase();
      return userAnswer === correctAnswer || 
             correctAnswer.includes(userAnswer) || 
             userAnswer.includes(correctAnswer);
    }
    
    return question.userAnswer === question.correctAnswer;
  }, []);

  const checkAnswers = async () => {
    setShowResults(true);
    
    if (user) {
      try {
        const correctAnswers = questions.filter(
          q => checkAnswerCorrectness(q)
        ).length;

        await saveQuizResult({
          userId: user.uid,
          mainTopic,
          totalQuestions: questions.length,
          correctAnswers,
          questions: questions.map(q => ({
            question: q.question,
            userAnswer: q.userAnswer || '',
            correctAnswer: q.correctAnswer,
            isCorrect: checkAnswerCorrectness(q)
          }))
        });

        onQuizComplete?.();
      } catch (error) {
        console.error('Error saving quiz result:', error);
      }
    }

    generateQuizSummary();
  };

  const resetQuiz = () => {
    setQuestions([]);
    setShowResults(false);
    setShowSummary(false);
    setQuizSummary('');
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => {
            setError(null);
            resetQuiz();
          }}
          className="text-blue-600 hover:text-blue-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <BookOpenIcon className="h-6 w-6 text-blue-500" />
        <button
          onClick={generateQuiz}
          disabled={isGenerating}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200"
        >
          {isGenerating ? 'Generating...' : 'Quiz Yourself'}
        </button>
      </div>

      {mainTopic && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-1">Main Topic:</h3>
          <p className="text-blue-600">{mainTopic}</p>
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="border rounded-lg p-4">
              <p className="font-medium mb-3">
                {index + 1}. {question.question}
              </p>
              
              {question.type === 'multiple-choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                        showResults
                          ? option === question.correctAnswer
                            ? 'bg-green-100'
                            : question.userAnswer === option
                            ? 'bg-red-100'
                            : ''
                          : question.userAnswer === option
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={question.userAnswer === option}
                        onChange={() => handleAnswerSelect(question.id, option)}
                        disabled={showResults}
                        className="mr-2"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'true-false' && (
                <div className="space-x-4">
                  {['True', 'False'].map((option) => (
                    <label
                      key={option}
                      className={`inline-flex items-center ${
                        showResults && option === question.correctAnswer
                          ? 'text-green-600'
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={question.userAnswer === option}
                        onChange={() => handleAnswerSelect(question.id, option)}
                        disabled={showResults}
                        className="mr-1"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'fill-blank' && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={question.userAnswer || ''}
                    onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                    disabled={showResults}
                    className={`border rounded px-3 py-2 w-full max-w-md ${
                      showResults 
                        ? checkAnswerCorrectness(question)
                          ? 'bg-green-50 border-green-300'
                          : 'bg-red-50 border-red-300'
                        : 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                    placeholder="Type your answer here..."
                  />
                  {showResults && (
                    <div className="mt-2">
                      {checkAnswerCorrectness(question) ? (
                        <p className="text-green-600 flex items-center">
                          <CheckCircleIcon className="h-5 w-5 mr-1" />
                          Correct!
                        </p>
                      ) : (
                        <div>
                          <p className="text-red-600 flex items-center">
                            <XCircleIcon className="h-5 w-5 mr-1" />
                            Incorrect
                          </p>
                          <p className="text-gray-600 mt-1">
                            The correct answer is: <span className="font-medium">{question.correctAnswer}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {!showResults && questions.every(q => q.userAnswer) && (
            <button
              onClick={checkAnswers}
              className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
            >
              Check Answers
            </button>
          )}

          {showSummary && quizSummary && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">Quiz Summary</h3>
              <div className="prose prose-sm max-w-none">
                {quizSummary.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2">
                    {paragraph}
                  </p>
                ))}
              </div>
              <button
                onClick={resetQuiz}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Try Another Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 