"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUserProgress } from '@/lib/firebase/firebaseUtils';
import { ChartBarIcon, BookmarkIcon, CheckCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface Progress {
  quizResults: any[];
  totalQuizzes: number;
  averageScore: number;
  totalBookmarks: number;
  recentTopics: string[];
}

export default function ProgressDashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const updateCount = useRef(0);

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setProgress(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getUserProgress(user.uid);
      console.log('Fetched progress data:', data, 'Update count:', updateCount.current++);
      setProgress(data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    console.log('Force refreshing progress...');
    fetchProgress();
  }, [fetchProgress]);

  // Initial fetch
  useEffect(() => {
    console.log('Initial progress fetch');
    fetchProgress();
  }, [fetchProgress]);

  // Listen for quiz completion events
  useEffect(() => {
    const dashboard = document.getElementById('progress-dashboard');
    if (!dashboard) {
      console.log('Dashboard element not found');
      return;
    }

    const handleQuizComplete = () => {
      console.log('Quiz completed event received');
      forceRefresh();
    };

    dashboard.addEventListener('quiz-completed', handleQuizComplete);
    console.log('Added quiz-completed event listener');

    return () => {
      dashboard.removeEventListener('quiz-completed', handleQuizComplete);
      console.log('Removed quiz-completed event listener');
    };
  }, [forceRefresh]);

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Sign in to view your progress</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading progress...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <ChartBarIcon className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Progress</h2>
        </div>
        <ChevronDownIcon 
          className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-blue-800 dark:text-blue-200 font-medium">Quizzes Taken</h3>
                <CheckCircleIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-300 mt-2">
                {progress?.totalQuizzes || 0}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-green-800 dark:text-green-200 font-medium">Average Score</h3>
                <ChartBarIcon className="h-6 w-6 text-green-500 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-300 mt-2">
                {Math.round((progress?.averageScore || 0) * 100)}%
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-purple-800 dark:text-purple-200 font-medium">Saved Explanations</h3>
                <BookmarkIcon className="h-6 w-6 text-purple-500 dark:text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-300 mt-2">
                {progress?.totalBookmarks || 0}
              </p>
            </div>
          </div>

          {progress && progress.recentTopics?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Recent Topics</h3>
              <div className="space-y-2">
                {progress.recentTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          )}

          {progress && progress.quizResults?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Recent Quiz Performance</h3>
              <div className="space-y-3">
                {progress.quizResults.slice(0, 5).map((result, index) => (
                  <div
                    key={result.id || index}
                    className="border dark:border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">{result.mainTopic}</span>
                      <span className={`text-sm ${
                        (result.correctAnswers / result.totalQuestions) >= 0.7
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {result.correctAnswers}/{result.totalQuestions} correct
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {result.timestamp instanceof Date 
                        ? result.timestamp.toLocaleDateString()
                        : new Date().toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 