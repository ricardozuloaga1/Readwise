'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getRecentDiscussions } from '@/lib/firebase/firebaseUtils';
import { ClockIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface DiscussionEntry {
  type: 'question' | 'response' | 'acknowledgment';
  text: string;
  timestamp: Date;
}

interface Discussion {
  id: string;
  userId: string;
  timestamp: Date;
  topic: string;
  entries: DiscussionEntry[];
  totalExchanges: number;
}

export default function ProgressReport() {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiscussions() {
      if (!user) return;
      
      try {
        setLoading(true);
        const recentDiscussions = await getRecentDiscussions(user.uid);
        setDiscussions(recentDiscussions as Discussion[]);
      } catch (err) {
        console.error('Error loading discussions:', err);
        setError('Failed to load discussion history');
      } finally {
        setLoading(false);
      }
    }

    loadDiscussions();
  }, [user]);

  if (!user) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to view your progress</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
        <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2 text-blue-500" />
        Discussion History
      </h2>

      {discussions.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
          No discussions yet. Start a new discussion to track your progress!
        </p>
      ) : (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <div
              key={discussion.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {discussion.topic}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {new Date(discussion.timestamp).toLocaleDateString()} at{' '}
                    {new Date(discussion.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-sm font-medium px-3 py-1 rounded-full">
                  {discussion.totalExchanges} exchanges
                </span>
              </div>

              <div className="space-y-3">
                {discussion.entries.slice(0, 3).map((entry, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      entry.type === 'question'
                        ? 'bg-gray-50 dark:bg-gray-700'
                        : entry.type === 'response'
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'bg-green-50 dark:bg-green-900/30'
                    }`}
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium capitalize">{entry.type}: </span>
                      {entry.text}
                    </p>
                  </div>
                ))}
                {discussion.entries.length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    + {discussion.entries.length - 3} more exchanges
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 