'use client';

import { useEffect, useRef } from 'react';
import { useDeepgram } from '@/lib/contexts/DeepgramContext';

interface SpeakingAvatarProps {
  isRecording: boolean;
}

export default function SpeakingAvatar({ isRecording }: SpeakingAvatarProps) {
  const { audioStream } = useDeepgram();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaStreamAudioSourceNode>();
  const dataArrayRef = useRef<Uint8Array>();

  useEffect(() => {
    if (!isRecording || !audioStream) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize audio context and analyser
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 32;
    
    // Connect the audio stream
    sourceRef.current = audioContextRef.current.createMediaStreamSource(audioStream);
    sourceRef.current.connect(analyserRef.current);
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    // Draw the avatar
    function drawAvatar(ctx: CanvasRenderingContext2D, volume: number) {
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw head
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#4B5563';
      ctx.fill();
      
      // Draw eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(width / 2 - 15, height / 2 - 10, 8, 0, Math.PI * 2);
      ctx.arc(width / 2 + 15, height / 2 - 10, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw mouth
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 + 10, 20, 0, Math.PI, false);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      
      // Add speaking animation
      if (volume > 0) {
        const mouthHeight = Math.min(15, volume / 5);
        ctx.beginPath();
        ctx.arc(width / 2, height / 2 + 10, 20, 0, Math.PI, false);
        ctx.lineTo(width / 2 + 20, height / 2 + 10 + mouthHeight);
        ctx.arc(width / 2, height / 2 + 10 + mouthHeight, 20, 0, Math.PI, true);
        ctx.fillStyle = '#1F2937';
        ctx.fill();
      }
    }

    // Animation loop
    function animate() {
      if (!analyserRef.current || !dataArrayRef.current || !canvas) return;
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const volume = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      
      if (ctx) {
        drawAvatar(ctx, volume);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isRecording, audioStream]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      className="bg-gray-100 dark:bg-gray-800 rounded-full"
    />
  );
} 