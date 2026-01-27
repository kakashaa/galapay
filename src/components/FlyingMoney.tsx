import { useEffect, useState } from 'react';

interface MoneyParticle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

export const FlyingMoney = () => {
  const [particles, setParticles] = useState<MoneyParticle[]>([]);

  useEffect(() => {
    const newParticles: MoneyParticle[] = [];
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 4 + Math.random() * 4,
        size: 16 + Math.random() * 16,
        rotation: Math.random() * 360,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-float-up opacity-40"
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            fontSize: `${particle.size}px`,
            transform: `rotate(${particle.rotation}deg)`,
          }}
        >
          💵
        </div>
      ))}
    </div>
  );
};
