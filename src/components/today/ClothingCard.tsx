'use client';

import { motion } from 'framer-motion';

interface ClothingCardProps {
  main: string;
  extras?: string[];
}

export default function ClothingCard({ main, extras = [] }: ClothingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="
        bg-white border border-gray-200 rounded-2xl
        p-5 space-y-2
      "
    >
      <h3
        className="text-base font-semibold text-gray-800 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-accent)' }}
      >
        <span className="text-xl">👕</span>
        오늘 옷차림
      </h3>

      <p
        className="text-lg font-bold text-gray-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {main}
      </p>

      {extras.length > 0 && (
        <div className="space-y-1 pt-1">
          {extras.map((extra, index) => (
            <p
              key={index}
              className="text-sm font-medium text-gray-600 flex items-center gap-1"
            >
              {extra}
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
