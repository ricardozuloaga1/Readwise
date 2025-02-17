import { useState, useCallback } from 'react';
import { BookOpenIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/hooks/useAuth';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: 'main-idea' | 'key-point' | 'detail' | 'concept' | 'application';
}

interface FlashcardGeneratorProps {
  articleText: string;
  highlightedText?: string;
}

export default function FlashcardGenerator({ articleText, highlightedText }: FlashcardGeneratorProps) {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateFlashcards = useCallback(async () => {
    if (!articleText && !highlightedText) {
      setError('Please provide some text to generate flashcards.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('Sending request to generate flashcards...');
      const response = await fetch('/api/openai/generate-flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: highlightedText || articleText,
        }),
      });

      const data = await response.json();
      console.log('Response received:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate flashcards');
      }

      if (!data.flashcards || !Array.isArray(data.flashcards) || data.flashcards.length === 0) {
        throw new Error('No flashcards were generated');
      }

      console.log('Successfully generated flashcards:', data.flashcards);
      setFlashcards(data.flashcards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      let errorMessage = error instanceof Error ? error.message : 'Failed to generate flashcards';
      
      // Add more context to the error message
      if (errorMessage.includes('API key')) {
        errorMessage = 'OpenAI API key is invalid or not configured. Please check your settings.';
      } else if (errorMessage.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      
      setError(errorMessage);
      setFlashcards([]);
    } finally {
      setIsGenerating(false);
    }
  }, [articleText, highlightedText]);

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const toggleCard = () => {
    setIsFlipped(!isFlipped);
  };

  const resetFlashcards = () => {
    setFlashcards([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => {
            setError(null);
            resetFlashcards();
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
          onClick={generateFlashcards}
          disabled={isGenerating}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200"
        >
          {isGenerating ? 'Generating...' : 'Flashcards!'}
        </button>
      </div>

      {flashcards.length > 0 ? (
        <div className="space-y-4">
          {/* Flashcard Display */}
          <div 
            onClick={toggleCard}
            className="relative h-48 w-full perspective-1000 cursor-pointer group"
          >
            <div className={`absolute w-full h-full transition-transform duration-500 transform-style-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}>
              {/* Front of card */}
              <div className={`absolute w-full h-full backface-hidden bg-white dark:bg-gray-800/80 rounded-lg border-2 border-blue-200 dark:border-blue-800/50 p-6 flex items-center justify-center text-center group-hover:border-blue-400 transition-colors duration-200 ${
                isFlipped ? 'hidden' : ''
              }`}>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {flashcards[currentCardIndex].front}
                </p>
              </div>
              
              {/* Back of card */}
              <div className={`absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800/50 p-6 flex items-center justify-center text-center transform rotate-y-180 group-hover:border-blue-400 transition-colors duration-200 ${
                !isFlipped ? 'hidden' : ''
              }`}>
                <p className="text-lg text-gray-900 dark:text-white">
                  {flashcards[currentCardIndex].back}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-4 px-2">
            <button
              onClick={handlePrevCard}
              className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              Previous
            </button>
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              {currentCardIndex + 1} / {flashcards.length}
            </span>
            <button
              onClick={handleNextCard}
              className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Next
              <ArrowRightIcon className="h-5 w-5 ml-1" />
            </button>
          </div>
        </div>
      ) : !error ? (
        <div className="py-4"></div>
      ) : null}

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
} 