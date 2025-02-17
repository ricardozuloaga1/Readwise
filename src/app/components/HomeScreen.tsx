"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf'; // For PDF rendering
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'; // PDF styling
import { useDropzone } from 'react-dropzone';
import mammoth from 'mammoth';
import ExplanationCard from '@/components/ExplanationCard';
import SignInWithGoogle from '@/components/SignInWithGoogle';
import { useAuth } from '@/lib/hooks/useAuth';
import { getBookmarks, removeBookmark } from '@/lib/firebase/firebaseUtils';
import BookmarkCard from '@/components/BookmarkCard';
import QuizGenerator from '@/components/QuizGenerator';
import ProgressDashboard from '@/components/ProgressDashboard';
import ErrorBoundary from '@/components/ErrorBoundary';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Bookmark {
  id: string;
  text: string;
  explanation: string;
  createdAt: any;
}

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [articleText, setArticleText] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);

    if (uploadedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result;
        if (arrayBuffer instanceof ArrayBuffer) {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setArticleText(result.value);
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    } else if (uploadedFile.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          setArticleText(text);
        }
      };
      reader.readAsText(uploadedFile);
    } else {
      // Handle other file types or show an error message
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
    },
  });

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setArticleText(event.target.value);
  };

  const handleMouseUp = async () => {
    const selection = window.getSelection();
    if (selection) {
      const selectedText = selection.toString();
      if (!selectedText.trim()) return; // Don't process empty selections
      
      setHighlightedText(selectedText);

      try {
        const response = await fetch('/api/openai/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: selectedText }),
        });

        const data = await response.json();
        setExplanation(data.explanation || 'No explanation available.');
      } catch (error) {
        setExplanation('Failed to fetch explanation.');
      }
    }
  };

  const refreshBookmarks = async () => {
    if (!user) return;
    
    try {
      setIsLoadingBookmarks(true);
      const userBookmarks = await getBookmarks(user.uid);
      console.log('Fetched bookmarks:', userBookmarks);
      setBookmarks(userBookmarks);
    } catch (error) {
      console.error('Error refreshing bookmarks:', error);
    } finally {
      setIsLoadingBookmarks(false);
    }
  };

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!user) {
        setBookmarks([]);
        return;
      }

      try {
        setIsLoadingBookmarks(true);
        const userBookmarks = await getBookmarks(user.uid);
        setBookmarks(userBookmarks);
      } catch (error) {
        console.error('Error fetching bookmarks:', error);
      } finally {
        setIsLoadingBookmarks(false);
      }
    };

    fetchBookmarks();
  }, [user]);

  const handleQuizComplete = useCallback(() => {
    console.log('Quiz completed callback triggered');
    const progressDashboard = document.getElementById('progress-dashboard');
    if (progressDashboard) {
      const event = new CustomEvent('quiz-completed');
      progressDashboard.dispatchEvent(event);
      console.log('Dispatched quiz-completed event from callback');
    } else {
      console.error('Progress dashboard element not found');
    }
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Upload or Paste Your Article</h1>
        <div className="flex items-center space-x-2">
          {user ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Signed in as {user.email}</span>
            </div>
          ) : (
            <>
              <span className="text-sm text-gray-600">Sign in to save bookmarks</span>
              <SignInWithGoogle />
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="mb-4">
            <textarea
              className="w-full p-2 border rounded"
              rows={10}
              placeholder="Paste your article text here..."
              value={articleText}
              onChange={handleTextChange}
            />
          </div>
          <div className="mb-4">
            <div {...getRootProps()} className="p-4 border-dashed border-2 rounded cursor-pointer">
              <input {...getInputProps()} />
              <p>Drag 'n' drop a file here, or click to select a file (PDF, DOCX, TXT)</p>
            </div>
          </div>
          <div className="border rounded overflow-y-auto h-96 p-4" onMouseUp={handleMouseUp}>
            <h2 className="text-xl font-semibold mb-4">Article Content</h2>
            <p>{articleText}</p>
          </div>
        </div>
        <div className="space-y-4">
          {highlightedText && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Current Selection</h2>
              <ExplanationCard
                text={highlightedText}
                explanation={explanation}
                onBookmarkChange={refreshBookmarks}
              />
            </div>
          )}
          <div>
            <ErrorBoundary>
              <QuizGenerator 
                articleText={articleText}
                highlightedText={highlightedText}
                onQuizComplete={handleQuizComplete}
              />
            </ErrorBoundary>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Bookmarks</h2>
            {!user ? (
              <p className="text-gray-500">Sign in to see your bookmarks</p>
            ) : isLoadingBookmarks ? (
              <p className="text-gray-500">Loading bookmarks...</p>
            ) : bookmarks.length === 0 ? (
              <p className="text-gray-500">No bookmarks yet</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {bookmarks.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    text={bookmark.text}
                    explanation={bookmark.explanation}
                    onRemove={async () => {
                      try {
                        await removeBookmark(user.uid, bookmark.id);
                        refreshBookmarks();
                      } catch (error) {
                        console.error('Error removing bookmark:', error);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          {user && (
            <div id="progress-dashboard" className="mt-6">
              <ProgressDashboard key={`progress-${user.uid}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen; 