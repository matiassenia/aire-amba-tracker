// ParticleLayer - Canvas-based animated particles for air flow visualization
import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';

interface Particle {
  x: number;
  y: number;
  speed: number;
  opacity: number;
  size: number;
}

interface ParticleLayerProps {
  averageAqi: number;
  particleCount?: number;
}

export function ParticleLayer({ averageAqi, particleCount = 60 }: ParticleLayerProps) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const windAngleRef = useRef(Math.random() * Math.PI * 2);

  // Create or get canvas
  const getCanvas = useCallback(() => {
    if (canvasRef.current) return canvasRef.current;

    const container = map.getContainer();
    let canvas = container.querySelector('.particle-canvas') as HTMLCanvasElement;
    
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'particle-canvas';
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 400;
        opacity: 0.6;
      `;
      container.appendChild(canvas);
    }

    canvasRef.current = canvas;
    return canvas;
  }, [map]);

  // Initialize particles
  const initParticles = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.3 + Math.random() * 0.4,
      opacity: 0.2 + Math.random() * 0.3,
      size: 1 + Math.random() * 2,
    }));
  }, [particleCount]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Speed factor based on AQI (cleaner air = faster particles)
    const speedFactor = Math.max(0.3, 1 - averageAqi / 200);
    
    // Slowly change wind direction
    windAngleRef.current += 0.001;

    // Update and draw particles
    const windX = Math.cos(windAngleRef.current);
    const windY = Math.sin(windAngleRef.current) * 0.3;

    particlesRef.current.forEach(p => {
      // Update position
      p.x += windX * p.speed * speedFactor;
      p.y += windY * p.speed * speedFactor;

      // Wrap around edges
      if (p.x > width) p.x = 0;
      if (p.x < 0) p.x = width;
      if (p.y > height) p.y = 0;
      if (p.y < 0) p.y = height;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * speedFactor})`;
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [averageAqi]);

  // Setup and cleanup
  useEffect(() => {
    const canvas = getCanvas();
    
    const resize = () => {
      const container = map.getContainer();
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);
    map.on('resize', resize);

    // Start animation
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      map.off('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Don't remove canvas to prevent flicker on re-render
    };
  }, [map, getCanvas, initParticles, animate]);

  return null;
}
