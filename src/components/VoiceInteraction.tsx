"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  MicrophoneIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { useDeepgram } from '@/lib/contexts/DeepgramContext';

interface VoiceInteractionProps {
  articleText: string;
  highlightedText: string;
}

export default function VoiceInteraction({ articleText, highlightedText }: VoiceInteractionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [systemResponse, setSystemResponse] = useState<string>('');
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [hasStartedDiscussion, setHasStartedDiscussion] = useState(false);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { startRecording, stopRecording, transcript } = useDeepgram();

  useEffect(() => {
    synthesisRef.current = window.speechSynthesis;
    return () => {
      if (synthesisRef.current?.speaking) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const startDiscussion = async () => {
    setIsLoading(true);
    setHasStartedDiscussion(true);
    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Analyze this article and provide: 1) A brief summary 2) The main point 3) An engaging discussion question. Format with clear sections: ${articleText}`
          }]
        })
      });

      if (!response.ok) throw new Error('Failed to generate response');
      
      const data = await response.json();
      setSystemResponse(data.response);
      // Immediately start speaking when response is received
      setIsSpeaking(true);
      speakText(data.response);
    } catch (error) {
      console.error('Error starting discussion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (!synthesisRef.current) return;

    // Cancel any ongoing speech
    if (synthesisRef.current.speaking) {
      synthesisRef.current.cancel();
    }

    utteranceRef.current = new SpeechSynthesisUtterance(text);
    utteranceRef.current.onstart = () => setIsSpeaking(true);
    utteranceRef.current.onend = () => {
      setIsSpeaking(false);
      // Don't automatically start recording when speech ends
    };
    utteranceRef.current.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    synthesisRef.current.speak(utteranceRef.current);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      synthesisRef.current?.cancel();
      setIsSpeaking(false);
    } else if (systemResponse) {
      speakText(systemResponse);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
      setIsListening(false);
      // Process the recorded response
      if (transcript) {
        handleUserInput(transcript);
      }
    } else {
      startRecording();
      setIsListening(true);
    }
  };

  // Handle transcript updates
  useEffect(() => {
    if (transcript && !isListening) {
      setUserQuestion(transcript);
      handleUserInput(transcript);
    }
  }, [transcript, isListening]);

  const handleUserInput = async (input: string) => {
    setIsLoading(true);
    stopRecording(); // Ensure recording is stopped
    setIsListening(false);
    
    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Context: ${articleText}`
            },
            {
              role: 'user',
              content: input
            }
          ]
        })
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      setSystemResponse(data.response);
      // Automatically start speaking the response
      setIsSpeaking(true);
      speakText(data.response);
    } catch (error) {
      console.error('Error handling user input:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!hasStartedDiscussion ? (
        <button
          onClick={startDiscussion}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
              Starting Discussion...
            </>
          ) : (
            "Feel Like Discussing?"
          )}
        </button>
      ) : (
        <>
          {/* Voice Controls */}
          <div className="flex justify-end space-x-2">
            {/* Stop/Resume Speech Button */}
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-full transition-colors ${
                isSpeaking 
                  ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
              }`}
              title={isSpeaking ? 'Stop speaking' : 'Resume speaking'}
            >
              {isSpeaking ? (
                <SpeakerXMarkIcon className="h-6 w-6" />
              ) : (
                <SpeakerWaveIcon className="h-6 w-6" />
              )}
            </button>

            {/* Start/Stop Recording Button */}
            <button
              onClick={toggleListening}
              disabled={isLoading || isSpeaking}
              className={`p-2 rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } ${(isLoading || isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isListening ? 'Stop recording' : 'Start recording'}
            >
              <MicrophoneIcon className="h-6 w-6" />
            </button>
          </div>

          {/* System Response */}
          {systemResponse && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">{systemResponse}</p>
            </div>
          )}

          {/* User Input Display */}
          {userQuestion && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 mb-1">Your response:</p>
              <p className="text-gray-700">{userQuestion}</p>
            </div>
          )}

          {isListening && (
            <div className="text-sm text-gray-500 animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping mr-2" />
              Recording... Click the microphone to stop
            </div>
          )}

          {isLoading && (
            <div className="text-sm text-gray-500 flex items-center justify-center">
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </div>
          )}
        </>
      )}
    </div>
  );
} 