'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { getBookmarks } from '@/lib/firebase/firebaseUtils';
import ExplanationCard from '@/components/ExplanationCard';

export default function BookmarksPage() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) return;
      
      try {
        const userBookmarks = await getBookmarks(user.uid);
        setBookmarks(userBookmarks);
      } catch (error) {
        console.error('Error fetching bookmarks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [user]);

  if (!user) {
    return (
      <div className="p-4">
        <p>Please sign in to view your bookmarks</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Your Bookmarked Explanations</h1>
      {bookmarks.length === 0 ? (
        <p>No bookmarks yet</p>
      ) : (
        bookmarks.map((bookmark) => (
          <ExplanationCard
            key={bookmark.id}
            text={bookmark.text}
            explanation={bookmark.explanation}
          />
        ))
      )}
    </div>
  );
} 