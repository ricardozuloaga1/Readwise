'use client';

import { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AudioRecorder } from './AudioRecorder';
import { useChat } from 'ai/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Discussion() {
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscription, setCurrentTranscription] = useState<string | null>(null);
  
  const { messages, append, isLoading } = useChat({
    api: '/api/anthropic/chat',
    initialMessages: [
      {
        role: 'assistant',
        content: "Hello! I'm here to discuss any topic with you. Feel free to speak or type your message.",
      },
    ],
  });

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    try {
      setError(null);
      setIsProcessing(true);
      setCurrentTranscription('Processing your audio...');

      // Create form data
      const formData = new FormData();
      formData.append('audio', blob);

      // Send to transcription API
      const response = await fetch('/api/deepgram/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Transcription failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.text) {
        throw new Error('No transcription received');
      }

      // Show transcription
      setCurrentTranscription(data.text);

      // Send to AI
      await append({
        role: 'user',
        content: data.text,
      });

      toast.success('Message sent successfully');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process audio';
      console.error('Error processing audio:', error);
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setCurrentTranscription(null);
    }
  }, [append]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Button
        onClick={() => {
          setShowDiscussion(!showDiscussion);
          setError(null);
        }}
        variant="outline"
        className="mb-4"
      >
        Feel like discussing
      </Button>

      {showDiscussion && (
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Interactive Discussion</h2>
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                )}
                <AudioRecorder onRecordingComplete={handleRecordingComplete} />
              </div>
            </div>
            
            {error && (
              <div className="p-2 text-sm text-red-600 bg-red-50 rounded">
                {error}
              </div>
            )}

            {currentTranscription && (
              <div className="p-2 text-sm text-gray-600 bg-gray-50 rounded italic">
                {currentTranscription}
              </div>
            )}
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto p-2">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-100 ml-auto max-w-[80%]' 
                      : 'bg-gray-100 max-w-[80%]'
                  }`}
                >
                  <p className="text-sm">
                    {message.content}
                  </p>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
} 