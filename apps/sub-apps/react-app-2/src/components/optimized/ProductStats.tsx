import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

interface ProductStatsProps {
  stats: Stats;
}

export const ProductStats: React.FC<ProductStatsProps> = React.memo(({ stats }) => {
  // Memoized formatted values
  const formattedStats = useMemo(() => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2
      }).format(value);
    };

    const formatPercentage = (value: number, total: number) => {
      if (total === 0) return '0%';
      return `${Math.round((value / total) * 100)}%`;
    };

    return {
      totalValueFormatted: formatCurrency(stats.totalValue),
      inStockPercentage: formatPercentage(stats.inStock, stats.total),
      lowStockPercentage: formatPercentage(stats.lowStock, stats.total),
      outOfStockPercentage: formatPercentage(stats.outOfStock, stats.total)
    };
  }, [stats]);

  // Memoized stat cards
  const statCards = useMemo(() => [
    {
      key: 'total',
      title: '总产品数',
      value: stats.total,
      color: 'blue',
      icon: '📦'
    },
    {
      key: 'inStock',
      title: '有库存',
      value: stats.inStock,
      percentage: formattedStats.inStockPercentage,
      color: 'green',
      icon: '✅'
    },
    {
      key: 'lowStock',
      title: '库存紧张',
      value: stats.lowStock,
      percentage: formattedStats.lowStockPercentage,
      color: 'yellow',
      icon: '⚠️'
    },
    {
      key: 'outOfStock',
      title: '缺货',
      value: stats.outOfStock,
      percentage: formattedStats.outOfStockPercentage,
      color: 'red',
      icon: '❌'
    },
    {
      key: 'totalValue',
      title: '库存总值',
      value: formattedStats.totalValueFormatted,
      color: 'purple',
      icon: '💰'
    }
  ], [stats, formattedStats]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <motion.div
      className="product-stats"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <h2 className="stats-title">库存概览</h2>
      <div className="stats-grid">
        {statCards.map((stat) => (
          <motion.div
            key={stat.key}
            className={`stat-card stat-card-${stat.color}`}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <h3 className="stat-title">{stat.title}</h3>
              <p className="stat-value">{stat.value}</p>
              {stat.percentage && (
                <p className="stat-percentage">{stat.percentage}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

ProductStats.displayName = 'ProductStats';