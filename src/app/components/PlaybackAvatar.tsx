'use client';

import { useEffect, useRef } from 'react';

interface PlaybackAvatarProps {
  audioUrl: string | null;
  isPlaying: boolean;
}

export default function PlaybackAvatar({ audioUrl, isPlaying }: PlaybackAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const audioElementRef = useRef<HTMLAudioElement>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();
  const animationFrameRef = useRef<number>();
  const dataArrayRef = useRef<Uint8Array>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize audio context and analyser
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 32;
    }

    // Create or update audio element
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
    }
    audioElementRef.current.src = audioUrl;

    // Connect audio element to analyser
    if (!sourceRef.current && audioContextRef.current && analyserRef.current && audioElementRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    if (!analyserRef.current) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    // Draw the modern avatar
    function drawAvatar(ctx: CanvasRenderingContext2D, volume: number) {
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      const normalizedVolume = Math.min(1, volume / 128);
      const breathingOffset = isPlaying ? Math.sin(Date.now() / 1000) * 2 : 0;
      const scale = 1 + (normalizedVolume * 0.05) + (breathingOffset * 0.01);
      
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      // Enhanced head shape with more realistic proportions
      const faceWidth = 65;
      const faceHeight = 80;
      const jawWidth = 55;
      
      // Create more natural skin gradient
      const skinGradient = ctx.createRadialGradient(
        centerX - 15, centerY - 20, 10,
        centerX, centerY, 90
      );
      skinGradient.addColorStop(0, '#FFE0B2');  // Highlight
      skinGradient.addColorStop(0.3, '#FFCC80'); // Mid tone
      skinGradient.addColorStop(0.6, '#FFB74D'); // Shadow
      skinGradient.addColorStop(1, '#FFA726');   // Deeper shadow

      // Draw face shape with jaw
      ctx.beginPath();
      ctx.moveTo(centerX - faceWidth/2, centerY - faceHeight/3); // Start at left temple
      ctx.quadraticCurveTo(
        centerX - faceWidth/2, centerY + faceHeight/3, // Control point
        centerX - jawWidth/2, centerY + faceHeight/2   // Jaw point
      );
      ctx.quadraticCurveTo(
        centerX, centerY + faceHeight/2 + 5,  // Chin control point
        centerX + jawWidth/2, centerY + faceHeight/2   // Right jaw point
      );
      ctx.quadraticCurveTo(
        centerX + faceWidth/2, centerY + faceHeight/3, // Control point
        centerX + faceWidth/2, centerY - faceHeight/3  // Right temple
      );
      ctx.quadraticCurveTo(
        centerX + faceWidth/2, centerY - faceHeight/2, // Control point
        centerX, centerY - faceHeight/2                // Top of head
      );
      ctx.quadraticCurveTo(
        centerX - faceWidth/2, centerY - faceHeight/2, // Control point
        centerX - faceWidth/2, centerY - faceHeight/3  // Back to start
      );
      ctx.fillStyle = skinGradient;
      ctx.fill();

      // Add face contours and shadows
      const contourGradient = ctx.createLinearGradient(
        centerX - faceWidth/2, centerY,
        centerX + faceWidth/2, centerY
      );
      contourGradient.addColorStop(0, 'rgba(0,0,0,0.1)');
      contourGradient.addColorStop(0.5, 'rgba(0,0,0,0)');
      contourGradient.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = contourGradient;
      ctx.fill();

      // Enhanced eyebrows with more natural shape
      const browY = centerY - 30;
      ctx.lineWidth = 3;
      
      // Left eyebrow
      const leftBrowControl = normalizedVolume * 3;
      ctx.beginPath();
      ctx.moveTo(centerX - 35, browY + 2);
      ctx.quadraticCurveTo(
        centerX - 25, browY - 4 + leftBrowControl,
        centerX - 15, browY
      );
      ctx.strokeStyle = '#4A5568';
      ctx.stroke();
      
      // Right eyebrow
      ctx.beginPath();
      ctx.moveTo(centerX + 15, browY);
      ctx.quadraticCurveTo(
        centerX + 25, browY - 4 + leftBrowControl,
        centerX + 35, browY + 2
      );
      ctx.stroke();

      // Enhanced eyes with more detail
      const eyeY = centerY - 15;
      const blinkFrequency = Date.now() / 200;
      const blinkHeight = isPlaying 
        ? 12 + (Math.sin(blinkFrequency) * 2)
        : 12;

      function drawEnhancedEye(x: number, rightEye: boolean) {
        // Eye socket shadow
        const socketGradient = ctx.createRadialGradient(
          x, eyeY, 5,
          x, eyeY, 20
        );
        socketGradient.addColorStop(0, 'rgba(0,0,0,0)');
        socketGradient.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = socketGradient;
        ctx.beginPath();
        ctx.ellipse(x, eyeY, 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // White of the eye
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(x, eyeY, 15, blinkHeight, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye movement
        const eyeMovementX = Math.sin(Date.now() / 1000) * 4;
        const eyeMovementY = Math.cos(Date.now() / 1000) * 2;

        // Iris with gradient
        const irisGradient = ctx.createRadialGradient(
          x + eyeMovementX, eyeY + eyeMovementY, 2,
          x + eyeMovementX, eyeY + eyeMovementY, 10
        );
        irisGradient.addColorStop(0, '#7B3F00');  // Brown center
        irisGradient.addColorStop(0.8, '#4A2500'); // Darker brown edge
        irisGradient.addColorStop(1, '#2D1810');   // Almost black edge
        
        ctx.beginPath();
        ctx.arc(x + eyeMovementX, eyeY + eyeMovementY, 8, 0, Math.PI * 2);
        ctx.fillStyle = irisGradient;
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.arc(x + eyeMovementX, eyeY + eyeMovementY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();

        // Multiple catchlights for realism
        const catchlightSize = 2.5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        
        // Main catchlight
        ctx.beginPath();
        ctx.arc(x + eyeMovementX - 2, eyeY + eyeMovementY - 2, catchlightSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Secondary smaller catchlight
        ctx.beginPath();
        ctx.arc(x + eyeMovementX + 3, eyeY + eyeMovementY - 1, catchlightSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      drawEnhancedEye(centerX - 25, false);
      drawEnhancedEye(centerX + 25, true);

      // Enhanced nose with more definition
      ctx.beginPath();
      ctx.moveTo(centerX - 6, eyeY + 15);
      ctx.quadraticCurveTo(
        centerX, eyeY + 35,
        centerX + 6, eyeY + 15
      );
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Nostril hints
      ctx.beginPath();
      ctx.arc(centerX - 5, eyeY + 32, 3, 0, Math.PI * 2);
      ctx.arc(centerX + 5, eyeY + 32, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fill();

      // Enhanced mouth with more realistic shape
      const mouthY = centerY + 25;
      const mouthWidth = 35 + (normalizedVolume * 15);
      const mouthHeight = 8 + (normalizedVolume * 12);

      // Mouth cavity
      ctx.beginPath();
      ctx.ellipse(
        centerX, mouthY,
        mouthWidth / 2, mouthHeight / 2,
        0, 0, Math.PI, false
      );
      ctx.fillStyle = '#2D3748';
      ctx.fill();

      // Teeth with better shading
      if (isPlaying && normalizedVolume > 0.1) {
        ctx.beginPath();
        ctx.ellipse(
          centerX, mouthY - 2,
          (mouthWidth / 2) - 4, (mouthHeight / 3) - 1,
          0, 0, Math.PI, false
        );
        const teethGradient = ctx.createLinearGradient(
          centerX, mouthY - mouthHeight/2,
          centerX, mouthY
        );
        teethGradient.addColorStop(0, '#FFFFFF');
        teethGradient.addColorStop(1, '#E8E8E8');
        ctx.fillStyle = teethGradient;
        ctx.fill();
      }

      // Enhanced lips with more natural color and shape
      const lipGradient = ctx.createLinearGradient(
        centerX - mouthWidth/2, mouthY,
        centerX + mouthWidth/2, mouthY
      );
      lipGradient.addColorStop(0, '#E57373');    // Lighter
      lipGradient.addColorStop(0.5, '#EF5350');  // Mid tone
      lipGradient.addColorStop(1, '#E57373');    // Lighter

      // Upper lip
      ctx.beginPath();
      ctx.moveTo(centerX - mouthWidth/2, mouthY);
      ctx.quadraticCurveTo(
        centerX, mouthY - 4,
        centerX + mouthWidth/2, mouthY
      );
      ctx.strokeStyle = lipGradient;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Lower lip with more volume
      ctx.beginPath();
      ctx.moveTo(centerX - mouthWidth/2, mouthY);
      ctx.quadraticCurveTo(
        centerX, mouthY + mouthHeight/2 + 2,
        centerX + mouthWidth/2, mouthY
      );
      ctx.stroke();

      // Enhanced cheeks with better coloring and shape
      const blushOpacity = 0.1 + (normalizedVolume * 0.15);
      const blushGradient = ctx.createRadialGradient(
        centerX - 45, centerY, 5,
        centerX - 45, centerY, 20
      );
      blushGradient.addColorStop(0, `rgba(255, 99, 132, ${blushOpacity})`);
      blushGradient.addColorStop(1, 'rgba(255, 99, 132, 0)');
      
      ctx.fillStyle = blushGradient;
      ctx.beginPath();
      ctx.ellipse(centerX - 45, centerY, 20, 15, Math.PI/6, 0, Math.PI * 2);
      ctx.fill();

      const rightBlushGradient = ctx.createRadialGradient(
        centerX + 45, centerY, 5,
        centerX + 45, centerY, 20
      );
      rightBlushGradient.addColorStop(0, `rgba(255, 99, 132, ${blushOpacity})`);
      rightBlushGradient.addColorStop(1, 'rgba(255, 99, 132, 0)');
      
      ctx.fillStyle = rightBlushGradient;
      ctx.beginPath();
      ctx.ellipse(centerX + 45, centerY, 20, 15, -Math.PI/6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Enhanced glow effect
      if (isPlaying && normalizedVolume > 0.1) {
        const glowSize = 30 + (normalizedVolume * 40);
        const glowGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, glowSize
        );
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // Animation loop
    function animate() {
      if (!analyserRef.current || !dataArrayRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const volume = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      
      if (ctx) {
        drawAvatar(ctx, isPlaying ? volume : 0);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // Start/stop audio playback
    if (isPlaying && audioElementRef.current) {
      audioElementRef.current.play();
      animate();
    } else if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Draw static avatar
      if (ctx) {
        drawAvatar(ctx, 0);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, [audioUrl, isPlaying]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-full shadow-lg"
      />
      {isPlaying && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-500 rounded-full text-white text-xs font-medium shadow-lg">
          Speaking...
        </div>
      )}
    </div>
  );
} 