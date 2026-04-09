'use client';

import { motion } from 'framer-motion';

interface ScoreCardProps {
  score: number;
  grade: 'clear' | 'caution' | 'stay';
  message: string;
}

const gradeConfig = {
  clear: {
    emoji: '☀️',
    color: '#22C55E',
    borderColor: 'border-[#22C55E]',
    textColor: 'text-[#22C55E]',
    shadowColor: 'shadow-[0_8px_24px_rgba(34,197,94,0.15)]',
  },
  caution: {
    emoji: '🌤',
    color: '#F59E0B',
    borderColor: 'border-[#F59E0B]',
    textColor: 'text-[#F59E0B]',
    shadowColor: 'shadow-[0_8px_24px_rgba(245,158,11,0.15)]',
  },
  stay: {
    emoji: '☁️',
    color: '#EF4444',
    borderColor: 'border-[#EF4444]',
    textColor: 'text-[#EF4444]',
    shadowColor: 'shadow-[0_8px_24px_rgba(239,68,68,0.15)]',
  },
};

export default function ScoreCard({ score, grade, message }: ScoreCardProps) {
  const config = gradeConfig[grade];

  return (
    <div className="flex justify-center py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`
          relative w-48 h-48 rounded-full bg-white
          border-4 ${config.borderColor} ${config.shadowColor}
          flex flex-col items-center justify-center
          hover:translate-y-[-2px] transition-transform duration-200
        `}
        aria-label={`외출 점수 ${score}점, ${message}`}
        role="status"
      >
        <div className="text-4xl mb-0.5">{config.emoji}</div>
        <div className="flex items-baseline">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className={`text-[52px] font-bold leading-none ${config.textColor}`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {score}
          </motion.span>
          <span className="text-lg font-medium text-gray-600 ml-1">점</span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className={`text-sm font-semibold mt-1 ${config.textColor}`}
          style={{ fontFamily: 'var(--font-accent)' }}
        >
          {message}
        </motion.p>
      </motion.div>
    </div>
  );
}
