'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDeepgram } from '@/lib/contexts/DeepgramContext';
import { 
  MicrophoneIcon, 
  StopIcon, 
  SpeakerWaveIcon, 
  ChatBubbleBottomCenterTextIcon,
  PauseIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import RealisticAvatar from './RealisticAvatar';
import { useAuth } from '@/lib/hooks/useAuth';
import { saveDiscussionHistory } from '@/lib/firebase/firebaseUtils';

interface VoiceInteractionProps {
  articleText: string;
  highlightedText?: string;
}

interface DiscussionEntry {
  type: 'question' | 'response' | 'acknowledgment';
  text: string;
  timestamp: Date;
}

// Helper function to prepare text
function prepareText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export default function VoiceInteraction({ articleText, highlightedText }: VoiceInteractionProps) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [userResponse, setUserResponse] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [acknowledgment, setAcknowledgment] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasStartedDiscussion, setHasStartedDiscussion] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { startRecording, stopRecording, transcript, isRecording, error: recordingError } = useDeepgram();
  const [error, setError] = useState<string | null>(null);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<DiscussionEntry[]>([]);

  // Function to save discussion history
  const saveDiscussion = useCallback(async () => {
    if (user && conversationHistory.length > 0) {
      try {
        const discussionSummary = {
          userId: user.uid,
          timestamp: new Date(),
          topic: highlightedText || articleText.substring(0, 100) + "...",
          entries: conversationHistory,
          totalExchanges: conversationHistory.filter(entry => entry.type === 'response').length
        };

        await saveDiscussionHistory(discussionSummary);
        console.log('Discussion history saved successfully');
      } catch (error) {
        console.error('Error saving discussion history:', error);
      }
    }
  }, [user, conversationHistory, highlightedText, articleText]);

  // Generate initial discussion points and question
  const generateDiscussion = useCallback(async () => {
    try {
      // Save previous discussion before starting new one
      await saveDiscussion();

      // Reset all states
      setIsGenerating(true);
      setError(null);
      setAcknowledgment('');
      setUserResponse('');
      setRealtimeTranscript('');
      setConversationHistory([]);
      
      if (!articleText && !highlightedText) {
        throw new Error('No text provided for discussion');
      }

      const response = await fetch('/api/openai/generate-discussion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: highlightedText || articleText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate discussion');
      }

      setCurrentQuestion(data.question);
      
      // Add initial question to conversation history
      setConversationHistory([{
        type: 'question',
        text: data.question,
        timestamp: new Date()
      }]);

      // Generate speech for the question
      const speechResponse = await fetch('/api/openai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `${data.discussion} Here's your question: ${data.question}`,
        }),
      });

      if (!speechResponse.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await speechResponse.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Automatically start playing when discussion is generated
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error in generateDiscussion:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate discussion');
    } finally {
      setIsGenerating(false);
    }
  }, [articleText, highlightedText, saveDiscussion]);

  const handleStartDiscussion = async () => {
    setHasStartedDiscussion(true);
    await generateDiscussion();
  };

  const handleStartRecording = async () => {
    setRealtimeTranscript('');
    setError(null);
    console.log('Starting recording...');
    try {
      await startRecording();
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check your microphone.');
    }
  };

  useEffect(() => {
    if (isRecording) {
      console.log('Transcript updated:', transcript);
      setRealtimeTranscript(transcript);
    }
  }, [transcript, isRecording]);

  const processResponse = async (responseText: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      console.log('Processing response...');

      // Add user's response to conversation history
      setConversationHistory(prev => [...prev, {
        type: 'response',
        text: responseText,
        timestamp: new Date()
      }]);

      const response = await fetch('/api/openai/evaluate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion,
          response: responseText,
          context: highlightedText || articleText,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Processing failed:', data.error);
        throw new Error(data.error || 'Failed to process response');
      }

      // Add acknowledgment and new question to conversation history
      setConversationHistory(prev => [
        ...prev,
        {
          type: 'acknowledgment',
          text: data.acknowledgment,
          timestamp: new Date()
        },
        {
          type: 'question',
          text: data.followUpQuestion,
          timestamp: new Date()
        }
      ]);

      setAcknowledgment(data.acknowledgment);
      setCurrentQuestion(data.followUpQuestion);

      // Generate speech for acknowledgment and follow-up
      try {
        const speechResponse = await fetch('/api/openai/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `${data.acknowledgment} ${data.followUpQuestion}`,
          }),
        });

        if (!speechResponse.ok) {
          throw new Error('Failed to generate speech');
        }

        const audioBlob = await speechResponse.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Automatically start playing the response
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (speechError) {
        console.error('Error generating speech:', speechError);
      }
    } catch (error) {
      console.error('Error in processResponse:', error);
      setError(error instanceof Error ? error.message : 'Failed to process response. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopRecording = async () => {
    console.log('Stopping recording...');
    stopRecording();
    setRealtimeTranscript('');
    
    if (transcript) {
      console.log('Final transcript:', transcript);
      setUserResponse(transcript);
      await processResponse(transcript);
    } else {
      console.log('No transcript available');
      setError('No speech was detected. Please try again.');
    }
  };

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  useEffect(() => {
    // Set up audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', () => setIsPlaying(false));
        audioRef.current = null;
      }
    };
  }, []);

  const resetDiscussion = useCallback(async () => {
    // Save the current discussion before resetting
    await saveDiscussion();
    
    // Reset all states
    setHasStartedDiscussion(false);
    setIsPlaying(false);
    setUserResponse('');
    setCurrentQuestion('');
    setAcknowledgment('');
    setIsGenerating(false);
    setIsProcessing(false);
    setAudioUrl(null);
    setError(null);
    setRealtimeTranscript('');
    setConversationHistory([]);
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [saveDiscussion]);

  return (
    <div className="space-y-6">
      {!hasStartedDiscussion ? (
        <button
          onClick={handleStartDiscussion}
          disabled={isGenerating}
          className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <ChatBubbleBottomCenterTextIcon className="h-6 w-6" />
          <span>I feel like discussing</span>
        </button>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <button
              onClick={resetDiscussion}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
              <span>New Discussion</span>
            </button>
            {isGenerating && (
              <span className="text-gray-500 animate-pulse">Generating discussion...</span>
            )}
          </div>

          <div className="flex flex-col items-center space-y-4">
            <RealisticAvatar isPlaying={isPlaying} audioUrl={audioUrl} />
            
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlayPause}
                disabled={!audioUrl}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isPlaying ? (
                  <>
                    <PauseIcon className="h-5 w-5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5" />
                    <span>Play</span>
                  </>
                )}
              </button>
              
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessing}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
              >
                {isRecording ? (
                  <>
                    <StopIcon className="h-5 w-5" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <MicrophoneIcon className="h-5 w-5" />
                    <span>Record Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-center">{error}</div>
          )}

          {realtimeTranscript && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">{realtimeTranscript}</p>
            </div>
          )}

          <div className="space-y-4">
            {conversationHistory.map((entry, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  entry.type === 'question'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                    : entry.type === 'response'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                }`}
              >
                <p>{entry.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 