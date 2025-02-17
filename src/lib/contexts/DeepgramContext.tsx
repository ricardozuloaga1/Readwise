"use client";

import {
  createClient,
  LiveClient,
  LiveTranscriptionEvents,
} from "@deepgram/sdk";

import { createContext, useContext, useState, ReactNode, FunctionComponent, useRef, useCallback, useEffect } from "react";

interface DeepgramContextType {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  transcript: string;
  isRecording: boolean;
  error: string | null;
  audioStream: MediaStream | null;
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(undefined);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

// Helper function to clean up transcript text
function cleanTranscript(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\s+\./g, '.') // Remove spaces before periods
    .replace(/\s+,/g, ',') // Remove spaces before commas
    .replace(/\s+\?/g, '?') // Remove spaces before question marks
    .replace(/\s+!/g, '!') // Remove spaces before exclamation marks
    .trim();
}

const DeepgramContextProvider: FunctionComponent<DeepgramContextProviderProps> = ({ children }) => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const deepgramRef = useRef<LiveClient | null>(null);
  const transcriptPartsRef = useRef<string[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Reset states
      setTranscript('');
      setError(null);
      transcriptPartsRef.current = [];
      
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      setAudioStream(stream);
      console.log('Microphone access granted');

      console.log('Fetching Deepgram API key...');
      const response = await fetch('/api/deepgram/transcribe-audio');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get Deepgram API key');
      }
      
      const { key } = await response.json();
      if (!key) {
        throw new Error('Deepgram API key not configured');
      }
      console.log('Deepgram API key received');

      console.log('Initializing Deepgram client...');
      const deepgram = createClient(key);
      const connection = deepgram.listen.live({
        model: 'nova-2',
        smart_format: true,
        encoding: 'linear16',
        channels: 1,
        language: 'en',
        punctuate: true,
        interim_results: false,
        endpointing: 1000,
      });

      // Set up connection event handlers
      connection.addListener(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened');
        setIsRecording(true);
        setError(null);

        // Initialize MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });

        // Handle audio data
        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        });

        // Start recording
        mediaRecorder.start(250);
        mediaRecorderRef.current = mediaRecorder;
        console.log('MediaRecorder started');
      });

      connection.addListener(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
        stopRecording();
      });

      connection.addListener(LiveTranscriptionEvents.Error, (error) => {
        console.error('Deepgram error:', error);
        setError('Error during transcription');
        stopRecording();
      });

      connection.addListener(LiveTranscriptionEvents.Transcript, (data) => {
        const received = data.channel?.alternatives[0]?.transcript || '';
        if (received && received.trim()) {
          console.log('Received transcript part:', received);
          
          // Add the new part to our array
          transcriptPartsRef.current.push(received);
          
          // Join all parts and clean up the text
          const fullTranscript = cleanTranscript(transcriptPartsRef.current.join(' '));
          console.log('Updated full transcript:', fullTranscript);
          
          setTranscript(fullTranscript);
        }
      });

      deepgramRef.current = connection;

    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      stopRecording();
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log('MediaRecorder stopped');
    }

    if (deepgramRef.current) {
      deepgramRef.current.finish();
      console.log('Deepgram connection finished');
    }

    if (audioStream) {
      audioStream.getTracks().forEach(track => {
        track.stop();
        console.log('Audio track stopped:', track.label);
      });
      setAudioStream(null);
    }

    // Clean up the final transcript
    if (transcriptPartsRef.current.length > 0) {
      const finalTranscript = cleanTranscript(transcriptPartsRef.current.join(' '));
      setTranscript(finalTranscript);
    }

    setIsRecording(false);
    mediaRecorderRef.current = null;
    deepgramRef.current = null;
    transcriptPartsRef.current = [];
    console.log('Recording cleanup completed');
  }, [audioStream]);

  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [stopRecording, isRecording]);

  return (
    <DeepgramContext.Provider
      value={{
        startRecording,
        stopRecording,
        transcript,
        isRecording,
        error,
        audioStream,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error('useDeepgram must be used within a DeepgramContextProvider');
  }
  return context;
}

export { DeepgramContextProvider, useDeepgram };
