'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NewsArticle } from '@/lib/types/news';

export default function BreakingNewsTicker() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch('/api/news?category=general');
        const data = await response.json();
        
        if (data.articles && Array.isArray(data.articles)) {
          // Sort by date and take the most recent articles
          const sortedNews = data.articles
            .sort((a: NewsArticle, b: NewsArticle) => 
              new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
            )
            .slice(0, 10); // Get top 10 news items
          
          setNews(sortedNews);
        }
      } catch (error) {
        console.error('Error fetching breaking news:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNews();
    // Refresh news every 5 minutes
    const refreshInterval = setInterval(fetchNews, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  if (isLoading || news.length === 0) {
    return null;
  }

  // Calculate the total width needed for all headlines
  const spacing = 200; // pixels between headlines

  return (
    <div className="w-full bg-red-600 text-white overflow-hidden py-2">
      <div className="relative">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: [`0%`, `-${100}%`],
          }}
          transition={{
            duration: news.length * 2.5, // Reduced to 2.5 seconds per headline (50% faster than current)
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {/* First set of headlines */}
          {news.map((article, index) => (
            <div
              key={`${article.url}-1`}
              className="inline-flex items-center"
              style={{ marginRight: `${spacing}px` }}
            >
              <span className="font-bold mr-3">BREAKING NEWS:</span>
              <span className="text-white/90">{article.title}</span>
              <span className="ml-3 text-white/75">
                - {article.source.name}
              </span>
            </div>
          ))}
          {/* Duplicate set of headlines to ensure smooth infinite scroll */}
          {news.map((article, index) => (
            <div
              key={`${article.url}-2`}
              className="inline-flex items-center"
              style={{ marginRight: `${spacing}px` }}
            >
              <span className="font-bold mr-3">BREAKING NEWS:</span>
              <span className="text-white/90">{article.title}</span>
              <span className="ml-3 text-white/75">
                - {article.source.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
} 