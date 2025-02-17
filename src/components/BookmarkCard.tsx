"use client";

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon } from '@heroicons/react/24/solid';

interface BookmarkCardProps {
  text: string;
  explanation: string;
  onRemove?: () => void;
}

export default function BookmarkCard({ text, explanation, onRemove }: BookmarkCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between">
        <div 
          className="flex-1 cursor-pointer"
          onClick={toggleExpand}
        >
          <div className="flex items-center space-x-2 mb-2">
            <BookmarkIcon className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Saved Explanation</h3>
          </div>
          <p className="text-gray-700 line-clamp-2">{text}</p>
        </div>
        <button
          onClick={toggleExpand}
          className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-gray-900 mb-2">Explanation:</h4>
          <p className="text-gray-700">{explanation}</p>
          {onRemove && (
            <button
              onClick={onRemove}
              className="mt-4 text-sm text-red-600 hover:text-red-800"
            >
              Remove bookmark
            </button>
          )}
        </div>
      )}
    </div>
  );
} 