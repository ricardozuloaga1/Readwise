'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { NewsArticle } from '@/lib/types/news';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { NewspaperIcon, ClockIcon, PhotoIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import CategorySelector, { Category } from './CategorySelector';

interface NewsTickerProps {
  onArticleSelect: (article: NewsArticle) => void;
}

const MIN_WIDTH = 96; // minimum width in pixels
const MAX_WIDTH = 480; // maximum width in pixels (reduced from 600)

export default function NewsTicker({ onArticleSelect }: NewsTickerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const width = useMotionValue(400); // initial width
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('general');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout>();
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);

  const fetchNews = async (category: Category) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/news?category=${category}`);
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      const data = await response.json();
      
      // Filter articles to only include those with valid thumbnails
      const articlesWithThumbnails = data.articles.filter(
        (article: NewsArticle) => article.urlToImage && 
        !article.urlToImage.includes('data:image') && // Exclude base64 images
        article.urlToImage.startsWith('http') // Ensure URL is valid
      );

      if (articlesWithThumbnails.length === 0) {
        setError('No articles with thumbnails found');
        setNews([]);
      } else {
        setNews(articlesWithThumbnails);
        setError(null);
      }

      // Reset scroll position and index when category changes
      setCurrentArticleIndex(0);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0 });
      }
    } catch (err) {
      setError('Failed to load news');
      console.error('Error fetching news:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedCategory);
    // Refresh news every 5 minutes
    const refreshInterval = setInterval(() => fetchNews(selectedCategory), 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [selectedCategory]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setIsAutoScrolling(false); // Pause auto-scroll when changing categories
  };

  const scrollToNextArticle = useCallback(() => {
    if (!isAutoScrolling || !scrollContainerRef.current || news.length === 0) return;

    const nextIndex = (currentArticleIndex + 1) % news.length;
    setCurrentArticleIndex(nextIndex);

    const container = scrollContainerRef.current;
    const articles = Array.from(container.getElementsByClassName('news-article'));
    
    if (articles[nextIndex]) {
      const article = articles[nextIndex] as HTMLElement;
      container.scrollTo({
        top: article.offsetTop - container.offsetTop,
        behavior: 'smooth'
      });
    }
  }, [currentArticleIndex, news.length, isAutoScrolling]);

  useEffect(() => {
    if (isAutoScrolling) {
      autoScrollIntervalRef.current = setInterval(scrollToNextArticle, 5000); // Scroll every 5 seconds
    }
    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [scrollToNextArticle, isAutoScrolling]);

  const handleArticleClick = async (article: NewsArticle) => {
    setSelectedId(article.url);
    setIsAutoScrolling(false); // Stop auto-scroll when user interacts
    try {
      const response = await fetch('/api/news/fetch-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: article.url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch article content');
      }

      const data = await response.json();
      onArticleSelect({
        ...article,
        content: data.content || article.content,
      });
    } catch (error) {
      console.error('Error fetching article content:', error);
      onArticleSelect(article);
    }
  };

  const handleImageError = (url: string) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.add(url);
      return newSet;
    });
  };

  const renderImage = (article: NewsArticle) => {
    if (!article.urlToImage || imageErrors.has(article.urlToImage)) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <PhotoIcon className="h-8 w-8 text-gray-400" />
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        <Image
          src={article.urlToImage}
          alt=""
          fill
          className="object-cover"
          onError={() => handleImageError(article.urlToImage!)}
          sizes="96px"
          loading="lazy"
        />
      </div>
    );
  };

  const handleDragStart = () => {
    setIsDragging(true);
    document.body.style.cursor = 'ew-resize';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.style.cursor = '';
    
    // If width is less than 200px, collapse the panel
    if (width.get() < 200) {
      setIsExpanded(false);
      width.set(MIN_WIDTH);
    }
  };

  const handleDrag = (event: MouseEvent) => {
    if (!isDragging) return;

    // Calculate available width (33% of viewport width)
    const maxAllowedWidth = Math.min(window.innerWidth * 0.33, MAX_WIDTH);
    const newWidth = Math.max(MIN_WIDTH, Math.min(maxAllowedWidth, event.clientX));
    width.set(newWidth);

    // Prevent text selection while dragging
    event.preventDefault();
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    width.set(isExpanded ? MIN_WIDTH : 400);
  };

  return (
    <motion.div
      className="relative h-full flex flex-col bg-white dark:bg-gray-800 shadow-lg"
      style={{ width }}
      initial={false}
      animate={{
        width: isExpanded ? width.get() : MIN_WIDTH,
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Drag handle */}
      <div
        className={`absolute -right-1 top-0 bottom-0 w-2 cursor-ew-resize z-30 group ${
          !isExpanded && 'pointer-events-none'
        }`}
        onMouseDown={handleDragStart}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors duration-200" />
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={toggleExpand}
        className="absolute -right-8 top-1/2 transform -translate-y-1/2 z-20 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <ChevronRightIcon 
          className={`h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-300 ${
            isExpanded ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      <div className={`h-full flex flex-col ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
        <CategorySelector
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scroll-smooth h-[calc(100vh-120px)]"
          onMouseEnter={() => setIsAutoScrolling(false)}
          onMouseLeave={() => setIsAutoScrolling(true)}
          style={{ scrollbarGutter: 'stable' }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center p-4"
              >
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading {selectedCategory} news...</p>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center p-4"
              >
                <div className="text-center">
                  <div className="text-red-500 mb-2">Failed to load news</div>
                  <button
                    onClick={() => fetchNews(selectedCategory)}
                    className="text-blue-500 hover:text-blue-600 underline"
                  >
                    Try refreshing
                  </button>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence>
                {news.map((article, index) => (
                  <motion.div
                    key={article.url}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    onClick={() => handleArticleClick(article)}
                    className={`news-article group p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 ${
                      selectedId === article.url ? 'bg-blue-50 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex space-x-4">
                      <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden">
                        {renderImage(article)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 mb-2 line-clamp-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <ClockIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                          <time dateTime={article.publishedAt} className="flex-shrink-0">
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </time>
                          <span className="mx-2 flex-shrink-0">•</span>
                          <span className="truncate">{article.source.name}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapsed View */}
      {!isExpanded && (
        <div className="absolute inset-0 flex flex-col items-center p-4 bg-white dark:bg-gray-800">
          <NewspaperIcon className="h-8 w-8 text-blue-500 mb-2" />
          <span className="text-xs text-gray-600 dark:text-gray-400 writing-mode-vertical transform rotate-180">
            Latest News
          </span>
        </div>
      )}
      
      {/* Auto-scroll button */}
      {isExpanded && (
        <button
          onClick={() => setIsAutoScrolling(!isAutoScrolling)}
          className={`fixed bottom-4 left-4 p-2 rounded-full shadow-lg transition-colors duration-200 z-10 ${
            isAutoScrolling 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          <svg 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isAutoScrolling ? (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
              />
            )}
          </svg>
        </button>
      )}
    </motion.div>
  );
} 