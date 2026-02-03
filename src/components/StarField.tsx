import { useEffect, useRef, useCallback, forwardRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  pulse: number;
  pulseSpeed: number;
}

interface StarFieldProps {
  starCount?: number;
}

export const StarField = forwardRef<HTMLCanvasElement, StarFieldProps>(({ starCount = 50 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>(0);
  const isRunningRef = useRef(true);

  const resizeHandler = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Recreate stars on resize
    starsRef.current = Array.from({ length: starCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 0.3 + 0.1,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
    }));
  }, [starCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isRunningRef.current = true;

    const drawStar = (star: Star) => {
      const pulseFactor = Math.sin(star.pulse) * 0.3 + 0.7;
      const currentOpacity = star.opacity * pulseFactor;
      const currentSize = star.size * pulseFactor;

      // Glow effect
      const gradient = ctx.createRadialGradient(
        star.x, star.y, 0,
        star.x, star.y, currentSize * 3
      );
      gradient.addColorStop(0, `hsla(142, 76%, 50%, ${currentOpacity})`);
      gradient.addColorStop(0.5, `hsla(142, 76%, 50%, ${currentOpacity * 0.3})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(star.x, star.y, currentSize * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(star.x, star.y, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(142, 76%, 70%, ${currentOpacity})`;
      ctx.fill();
    };

    const animate = () => {
      if (!isRunningRef.current) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((star) => {
        // Update pulse
        star.pulse += star.pulseSpeed;

        // Slow upward drift
        star.y -= star.speed;
        if (star.y < -10) {
          star.y = canvas.height + 10;
          star.x = Math.random() * canvas.width;
        }

        drawStar(star);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resizeHandler();
    animate();

    // Add resize listener
    window.addEventListener('resize', resizeHandler);

    return () => {
      isRunningRef.current = false;
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeHandler);
    };
  }, [starCount, resizeHandler]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
});

StarField.displayName = 'StarField';

export default StarField;
