'use client';

import { useEffect, useRef } from 'react';

interface RealisticAvatarProps {
  isPlaying: boolean;
  audioUrl?: string | null;
  expression?: 'neutral' | 'happy' | 'speaking';
}

export default function RealisticAvatar({ isPlaying, audioUrl, expression = 'neutral' }: RealisticAvatarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mouthRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    audioRef.current = new Audio(audioUrl);
    
    if (isPlaying) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.remove();
      }
    };
  }, [audioUrl, isPlaying]);

  return (
    <div className="relative w-[280px] h-[280px] bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-full shadow-lg overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{
          transform: isPlaying ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Head */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="#FFB6C1"
          className="dark:fill-pink-400"
        />

        {/* Eyes */}
        <g className={`transition-transform duration-300 ${isPlaying ? 'animate-blink' : ''}`}>
          <circle cx="35" cy="45" r="5" fill="#1F2937" className="dark:fill-gray-200" />
          <circle cx="65" cy="45" r="5" fill="#1F2937" className="dark:fill-gray-200" />
        </g>

        {/* Eyebrows */}
        <path
          d="M30 35 Q35 32 40 35"
          stroke="#1F2937"
          strokeWidth="2"
          fill="none"
          className="dark:stroke-gray-200"
        />
        <path
          d="M60 35 Q65 32 70 35"
          stroke="#1F2937"
          strokeWidth="2"
          fill="none"
          className="dark:stroke-gray-200"
        />

        {/* Mouth */}
        <path
          ref={mouthRef}
          d={isPlaying 
            ? "M35 65 Q50 75 65 65" // Speaking mouth
            : "M35 65 Q50 70 65 65" // Neutral mouth
          }
          stroke="#1F2937"
          strokeWidth="3"
          fill="none"
          className={`dark:stroke-gray-200 transition-all duration-200 ${
            isPlaying ? 'animate-speak' : ''
          }`}
        />

        {/* Cheeks */}
        <circle
          cx="30"
          cy="60"
          r="5"
          fill="#FF9999"
          opacity="0.5"
          className="dark:fill-pink-300"
        />
        <circle
          cx="70"
          cy="60"
          r="5"
          fill="#FF9999"
          opacity="0.5"
          className="dark:fill-pink-300"
        />
      </svg>

      {isPlaying && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-500 rounded-full text-white text-xs font-medium shadow-lg">
          Speaking...
        </div>
      )}

      <style jsx>{`
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }

        @keyframes speak {
          0%, 100% { d: path("M35 65 Q50 70 65 65"); }
          50% { d: path("M35 65 Q50 75 65 65"); }
        }

        .animate-blink {
          animation: blink 3s infinite;
        }

        .animate-speak {
          animation: speak 0.3s infinite;
        }
      `}</style>
    </div>
  );
} 