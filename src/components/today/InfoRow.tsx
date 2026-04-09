'use client';

import { motion } from 'framer-motion';

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  rightIcon?: string;
  rightLabel?: string;
  rightValue?: string;
  delay?: number;
}

export default function InfoRow({
  icon,
  label,
  value,
  rightIcon,
  rightLabel,
  rightValue,
  delay = 0,
}: InfoRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="
        flex items-center justify-between
        min-h-11 px-4 py-2.5
        bg-white border border-gray-200 rounded-xl
      "
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
      </div>

      {(rightIcon || rightLabel || rightValue) && (
        <div className="flex items-center gap-2">
          {rightIcon && <span className="text-xl">{rightIcon}</span>}
          {rightLabel && (
            <span className="text-sm font-medium text-gray-500">{rightLabel}</span>
          )}
          {rightValue && (
            <span className="text-sm font-semibold text-gray-700">{rightValue}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
