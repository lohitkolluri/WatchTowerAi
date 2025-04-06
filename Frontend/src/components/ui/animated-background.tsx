"use client";

import React, { useRef, useEffect } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create nodes
    const nodeCount = Math.floor(window.innerWidth / 150); // Fewer nodes for a cleaner look
    const nodes: Node[] = [];

    // Define colors that match the UI theme
    const nodeColors = [
      'rgba(0, 255, 240, 0.03)',  // Main cyan color
      'rgba(0, 255, 240, 0.05)',  // Slightly stronger
      'rgba(0, 240, 255, 0.04)',  // Slight variation
      'rgba(0, 230, 250, 0.03)',  // Another slight variation
    ];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15, // Slower movement
        vy: (Math.random() - 0.5) * 0.15, // Slower movement
        radius: Math.random() * 1.5 + 0.5,
        color: nodeColors[Math.floor(Math.random() * nodeColors.length)],
      });
    }

    const maxDistance = 180;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw nodes and connections
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const otherNode = nodes[j];
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.strokeStyle = `rgba(0, 255, 240, ${(1 - distance / maxDistance) * 0.05})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 -z-10 opacity-25"
      style={{ pointerEvents: 'none' }}
    />
  );
}
