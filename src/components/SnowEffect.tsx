'use client';

import { useEffect, useState } from 'react';

export function SnowEffect() {
  const [snowflakes, setSnowflakes] = useState<
    Array<{ id: number; left: number; duration: number; delay: number; size: number; opacity: number }>
  >([]);

  useEffect(() => {
    // Generate 32 delicate snowflakes
    const flakes = Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 8 + Math.random() * 12, // 8-20s slow falling
      delay: Math.random() * 10,
      size: 8 + Math.random() * 12,
      opacity: 0.25 + Math.random() * 0.45,
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="snow-container">
      {snowflakes.map((flake) => (
        <span
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}

export default SnowEffect;
