'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import NewsTicker from './components/NewsTicker';
import QuizGenerator from '../app/components/QuizGenerator';
import ExplanationCard from '@/components/ExplanationCard';
import ProgressDashboard from '@/components/ProgressDashboard';
import LoginButton from '@/app/components/LoginButton';
import { NewsArticle } from '@/lib/types/news';
import { ErrorBoundary } from 'react-error-boundary';
import { BookOpenIcon, DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import FlashcardGenerator from '@/app/components/FlashcardGenerator';
import VoiceInteraction from '@/app/components/VoiceInteraction';
import { useAuth } from '@/lib/hooks/useAuth';
import Logo from '@/app/components/Logo';
import BreakingNewsTicker from '@/app/components/BreakingNewsTicker';

interface Concept {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
}

// Helper function to format article content
function formatArticleContent(content: string): string {
  if (!content) return '';
  
  // Clean up the content first
  const cleanedContent = content
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .trim();

  // Split content into paragraphs using various common separators
  const paragraphs = cleanedContent
    .split(/(?:\n\n|\.\s+(?=[A-Z])|(?<=\.)\s*(?=[A-Z][a-z]))/) // Split on double newlines or sentences
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Wrap each paragraph in a styled div
  return paragraphs
    .map(p => `<div class="mb-6 leading-relaxed text-gray-700 dark:text-gray-300">${p}.</div>`)
    .join('\n');
}

export default function Home() {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [hoveredText, setHoveredText] = useState<string>('');
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const articleContentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const handleArticleSelect = (article: NewsArticle) => {
    setSelectedArticle(article);
    setHighlightedText('');
    setExplanation('');
    setImageError(false);
    setImageLoading(true);
  };

  // Function to process text and identify concepts
  const processArticleContent = useCallback(async (content: string) => {
    try {
      const response = await fetch('/api/openai/identify-concepts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) {
        throw new Error('Failed to process concepts');
      }

      const data = await response.json();
      setConcepts(data.concepts || []);
    } catch (error) {
      console.error('Error processing concepts:', error);
      setConcepts([]);
    }
  }, []);

  // Update article content when selected
  useEffect(() => {
    if (selectedArticle) {
      const content = selectedArticle.content || selectedArticle.description || '';
      processArticleContent(content);
    }
  }, [selectedArticle, processArticleContent]);

  const wrapConceptsInText = useCallback((text: string, concepts: Concept[]) => {
    // Sort concepts by start index in reverse order to handle overlapping concepts
    const sortedConcepts = [...concepts].sort((a, b) => b.startIndex - a.startIndex);
    
    let result = text;
    sortedConcepts.forEach(concept => {
      const before = result.slice(0, concept.startIndex);
      const after = result.slice(concept.endIndex);
      const conceptText = result.slice(concept.startIndex, concept.endIndex);
      
      result = `${before}<span class="concept-highlight" data-concept-type="${concept.type}">${conceptText}</span>${after}`;
    });

    return result;
  }, []);

  const handleTextHover = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Only process if hovering over a concept
    if (target.classList.contains('concept-highlight')) {
      const conceptText = target.textContent || '';
      const conceptType = target.getAttribute('data-concept-type');
      
      if (conceptText && conceptType) {
        setHoveredText(conceptText);
        
        // Get explanation for the concept
        fetch('/api/openai/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: conceptText,
            type: conceptType 
          }),
        })
        .then(response => response.json())
        .then(data => {
          setExplanation(data.explanation || 'No explanation available.');
        })
        .catch(error => {
          console.error('Error fetching explanation:', error);
          setExplanation('Failed to generate explanation.');
        });
      }
    }
  }, []);

  const handleTextHoverEnd = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('concept-highlight')) {
      setHoveredText('');
    }
  }, []);

  const handleTextSelection = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      setHighlightedText(selectedText);

      try {
        const response = await fetch('/api/openai/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: selectedText }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch explanation');
        }

        const data = await response.json();
        setExplanation(data.explanation || 'No explanation available.');
      } catch (error) {
        console.error('Error fetching explanation:', error);
        setExplanation('Failed to generate explanation.');
      }
    }
  }, []);

  const handleTextDeselect = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length === 0) {
      setHighlightedText('');
      setExplanation('');
    }
  }, []);

  const handleQuizComplete = useCallback(() => {
    const dashboard = document.getElementById('progress-dashboard');
    if (dashboard) {
      const event = new CustomEvent('quiz-completed');
      dashboard.dispatchEvent(event);
    }
  }, []);

  const renderHeroImage = (article: NewsArticle) => {
    if (!article.urlToImage || imageError) {
      return null;
    }

    return (
      <div className="relative w-full h-[400px] bg-gray-100 dark:bg-gray-700">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
          </div>
        )}
        <Image
          src={article.urlToImage}
          alt={article.title}
          fill
          className={`object-cover transition-opacity duration-300 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoading(false)}
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
        />
      </div>
    );
  };

  return (
    <main className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Header */}
      <header className="w-full bg-white shadow-lg">
        <div className="max-w-[1600px] mx-auto px-6 py-4 grid grid-cols-3 items-center">
          <div className="flex justify-start">
            <p className="font-dancing-script text-gray-800 text-4xl font-medium italic">
              Think. Discuss. Understand the News.
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <Logo />
          </div>

          <div className="flex justify-end">
            <LoginButton />
          </div>
        </div>
        <BreakingNewsTicker />
      </header>

      <div className="flex flex-1">
        {/* News Ticker Section - Fixed width container */}
        <div className="w-[480px] min-w-[96px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-gray-900 dark:text-white">
              <DocumentTextIcon className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Latest News</h2>
            </div>
          </div>
          <NewsTicker onArticleSelect={handleArticleSelect} />
        </div>

        {/* Content Section - Flexible width */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {selectedArticle ? (
            <div className="flex gap-8 max-w-[1600px] mx-auto py-8 px-6">
              {/* Main Article Content */}
              <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-8">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Article Content</h2>
                  </div>
                  {/* Article Image */}
                  {renderHeroImage(selectedArticle)}
                  
                  <div className="p-8">
                    <div 
                      ref={articleContentRef}
                      className="space-y-6 hover:cursor-text font-serif text-lg leading-relaxed max-w-prose mx-auto"
                      onMouseMove={handleTextHover}
                      onMouseLeave={handleTextHoverEnd}
                      dangerouslySetInnerHTML={{
                        __html: wrapConceptsInText(
                          formatArticleContent(selectedArticle.content || selectedArticle.description || ''),
                          concepts
                        )
                      }}
                    />
                  </div>
                </div>

                {/* Definition Card - Show for both hover and click */}
                {(hoveredText || highlightedText) && explanation && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
                    <div className="flex items-center mb-6">
                      <BookOpenIcon className="h-6 w-6 text-blue-500 mr-3" />
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Definition & Explanation
                      </h2>
                    </div>
                    <ExplanationCard
                      text={highlightedText || hoveredText}
                      explanation={explanation}
                    />
                  </div>
                )}
              </div>

              {/* Right Sidebar */}
              <div className="w-[400px] flex-shrink-0 space-y-6">
                {/* Voice Interaction Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-blue-100 dark:border-blue-900/30">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Interactive Discussion</h2>
                  </div>
                  <div className="p-6">
                    <ErrorBoundary fallback={<div>Error loading voice interaction</div>}>
                      {selectedArticle ? (
                        <VoiceInteraction
                          articleText={selectedArticle.content || selectedArticle.description || ''}
                          highlightedText={highlightedText}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Select an article to start a discussion
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Quiz Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-blue-100 dark:border-blue-900/30">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quiz</h2>
                  </div>
                  <div className="p-6">
                    <ErrorBoundary fallback={<div>Error loading quiz generator</div>}>
                      {selectedArticle ? (
                        <QuizGenerator 
                          articleText={selectedArticle.content || selectedArticle.description || ''} 
                          highlightedText={highlightedText}
                          onQuizComplete={handleQuizComplete}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Select an article to generate a quiz
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Flashcard Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-blue-100 dark:border-blue-900/30">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Flashcards</h2>
                  </div>
                  <div className="p-6">
                    <ErrorBoundary fallback={<div>Error loading flashcard generator</div>}>
                      {selectedArticle ? (
                        <FlashcardGenerator
                          articleText={selectedArticle.content || selectedArticle.description || ''}
                          highlightedText={highlightedText}
                        />
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Select an article to create flashcards
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Progress Dashboard */}
                <div id="progress-dashboard" className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Progress</h2>
                  </div>
                  <div className="p-6">
                    <ErrorBoundary fallback={<div>Error loading progress dashboard</div>}>
                      {user ? (
                        <ProgressDashboard />
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Sign in to track your progress
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8">
              <DocumentTextIcon className="h-16 w-16 mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Select an Article</h2>
              <p className="text-center text-gray-500">
                Choose a news article from the left panel to view its content and generate quizzes
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}