import React from 'react';
import { motion } from 'framer-motion';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <motion.div
      className="error-fallback"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="error-icon">🚨</div>
      <h2>出错了</h2>
      <p className="error-message">{error.message}</p>
      <details className="error-details">
        <summary>详细信息</summary>
        <pre>{error.stack}</pre>
      </details>
      <div className="error-actions">
        <button onClick={resetError} className="btn-retry">
          重试
        </button>
        <button
          onClick={() => window.location.reload()}
          className="btn-reload"
        >
          刷新页面
        </button>
      </div>
    </motion.div>
  );
};