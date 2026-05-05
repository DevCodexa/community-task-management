import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
}

interface CustomConfettiProps {
  active: boolean;
  pieceCount?: number;
}

const CONFETTI_COLORS = ['#74C0FC', '#E879F9', '#FFD43B', '#FF6B6B', '#4ADE80', '#FB7185', '#A78BFA'];

export const CustomConfetti: React.FC<CustomConfettiProps> = ({ 
  active, 
  pieceCount = 50 
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 2,
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
      }));
      setPieces(newPieces);
    } else {
      setPieces([]);
    }
  }, [active, pieceCount]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{ 
              x: `${piece.x}%`, 
              y: -20, 
              rotate: 0,
              opacity: 1 
            }}
            animate={{ 
              y: '120vh',
              rotate: piece.rotation + 720,
              x: piece.x + (Math.random() * 30 - 15),
              opacity: 0
            }}
            transition={{ 
              duration: 2 + Math.random() * 2,
              delay: piece.delay,
              ease: 'linear'
            }}
            className="absolute top-0"
            style={{
              width: piece.size,
              height: piece.size * 0.6,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? '2px' : '50%',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
