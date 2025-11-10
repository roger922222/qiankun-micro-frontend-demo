import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#3b82f6',
  text = '加载中...' 
}) => {
  const sizeMap = {
    small: { width: 20, height: 20, borderWidth: 2 },
    medium: { width: 40, height: 40, borderWidth: 3 },
    large: { width: 60, height: 60, borderWidth: 4 }
  };

  const dimensions = sizeMap[size];

  return (
    <motion.div
      className="loading-spinner"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="spinner-ring"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderWidth: dimensions.borderWidth,
          borderColor: `${color} transparent transparent transparent`
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      {text && <p className="spinner-text">{text}</p>}
    </motion.div>
  );
};