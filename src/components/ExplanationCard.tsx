"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { addBookmark, removeBookmark, checkIfBookmarked } from '@/lib/firebase/firebaseUtils';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

interface ExplanationCardProps {
  text: string;
  explanation: string;
  onBookmarkChange?: () => void;
}

export default function ExplanationCard({ text, explanation, onBookmarkChange }: ExplanationCardProps) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);

  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!user) return;
      
      try {
        const id = await checkIfBookmarked(user.uid, text);
        setIsBookmarked(!!id);
        setBookmarkId(id);
      } catch (error) {
        console.error('Error checking bookmark status:', error);
      }
    };

    checkBookmarkStatus();
  }, [user, text]);

  const handleBookmark = async () => {
    if (!user) {
      alert('Please sign in to bookmark explanations');
      return;
    }

    console.log('Starting bookmark process...', {
      user: {
        uid: user.uid,
        email: user.email
      },
      isBookmarked,
      bookmarkId,
      textLength: text.length,
      explanationLength: explanation.length
    });

    try {
      setIsBookmarking(true);
      
      if (isBookmarked && bookmarkId) {
        console.log('Attempting to remove bookmark:', bookmarkId);
        await removeBookmark(user.uid, bookmarkId);
        setIsBookmarked(false);
        setBookmarkId(null);
        console.log('Bookmark removed successfully');
      } else {
        console.log('Attempting to add bookmark...');
        const id = await addBookmark(user.uid, text, explanation);
        console.log('Bookmark added with ID:', id);
        setIsBookmarked(true);
        setBookmarkId(id);
      }
      
      console.log('Calling onBookmarkChange callback...');
      onBookmarkChange?.();
      console.log('Bookmark operation completed successfully');
    } catch (error) {
      console.error('Error in handleBookmark:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      alert(isBookmarked ? 'Failed to remove bookmark' : 'Failed to add bookmark');
    } finally {
      setIsBookmarking(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold mb-2">Original Text:</h3>
          <p className="text-gray-700 mb-4">{text}</p>
          <h3 className="font-semibold mb-2">Explanation:</h3>
          <p className="text-gray-700">{explanation}</p>
        </div>
        {user && (
          <button
            onClick={handleBookmark}
            disabled={isBookmarking}
            className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
              isBookmarking ? 'opacity-50' : ''
            }`}
            title={isBookmarked ? 'Remove bookmark' : 'Add to bookmarks'}
          >
            {isBookmarked ? (
              <BookmarkSolidIcon className="h-6 w-6 text-blue-500" />
            ) : (
              <BookmarkIcon className="h-6 w-6 text-gray-500 hover:text-blue-500" />
            )}
          </button>
        )}
      </div>
      {isBookmarking && (
        <p className="text-sm text-gray-500 mt-2">
          {isBookmarked ? 'Removing bookmark...' : 'Saving bookmark...'}
        </p>
      )}
    </div>
  );
} 