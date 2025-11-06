import { Request, Response } from 'express';
import { ErrorLogger, ErrorAnalyzer } from '../utils/error-logger';
import { ErrorResponseUtil } from '../utils/error-handler';

const errorLogger = ErrorLogger.getInstance();

/**
 * 错误统计控制器
 */
export class ErrorController {
  /**
   * 获取错误统计信息
   */
  async getErrorStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = errorLogger.getErrorStats();
      const issues = ErrorAnalyzer.identifyIssues(stats);
      
      res.json(ErrorResponseUtil.success({
        stats,
        issues,
        summary: {
          totalErrors: stats.totalErrors,
          errorRate: stats.errorRate,
          criticalErrors: stats.byLevel.CRITICAL,
          highErrors: stats.byLevel.HIGH
        }
      }, '获取错误统计成功'));
    } catch (error) {
      console.error('获取错误统计失败:', error);
      res.status(500).json(ErrorResponseUtil.systemError(
        error as Error,
        { operation: 'getErrorStats' }
      ));
    }
  }

  /**
   * 获取错误趋势
   */
  async getErrorTrend(req: Request, res: Response): Promise<void> {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const trend = errorLogger.getErrorTrend(hours);
      
      res.json(ErrorResponseUtil.success({
        trend,
        hours,
        summary: {
          totalErrors: trend.reduce((sum, item) => sum + item.count, 0),
          peakHour: trend.reduce((max, item) => item.count > max.count ? item : max, trend[0]),
          averageErrors: trend.reduce((sum, item) => sum + item.count, 0) / trend.length
        }
      }, '获取错误趋势成功'));
    } catch (error) {
      console.error('获取错误趋势失败:', error);
      res.status(500).json(ErrorResponseUtil.systemError(
        error as Error,
        { operation: 'getErrorTrend' }
      ));
    }
  }

  /**
   * 获取错误详情
   */
  async getErrorDetails(req: Request, res: Response): Promise<void> {
    try {
      const { code, category, level, startTime, endTime } = req.query;
      
      let errors = [];
      
      // 根据查询参数筛选错误
      if (startTime && endTime) {
        const start = new Date(startTime as string);
        const end = new Date(endTime as string);
        errors = errorLogger.getErrorsByTimeRange(start, end);
      } else {
        // 默认获取最近100条错误
        errors = errorLogger.getErrorStats().recentErrors;
      }
      
      // 应用筛选条件
      if (code) {
        errors = errors.filter(e => e.code === parseInt(code as string));
      }
      
      if (category) {
        errors = errors.filter(e => e.category === category);
      }
      
      if (level) {
        errors = errors.filter(e => e.level === level);
      }
      
      // 分析错误模式
      const patterns = ErrorAnalyzer.analyzePatterns(errors);
      
      res.json(ErrorResponseUtil.success({
        errors: errors.slice(0, 50), // 限制返回数量
        patterns,
        totalCount: errors.length,
        filters: { code, category, level, startTime, endTime }
      }, '获取错误详情成功'));
    } catch (error) {
      console.error('获取错误详情失败:', error);
      res.status(500).json(ErrorResponseUtil.systemError(
        error as Error,
        { operation: 'getErrorDetails' }
      ));
    }
  }

  /**
   * 获取错误报告
   */
  async getErrorReport(req: Request, res: Response): Promise<void> {
    try {
      const stats = errorLogger.getErrorStats();
      const report = ErrorAnalyzer.generateReport(stats);
      const issues = ErrorAnalyzer.identifyIssues(stats);
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(report);
    } catch (error) {
      console.error('生成错误报告失败:', error);
      res.status(500).json(ErrorResponseUtil.systemError(
        error as Error,
        { operation: 'getErrorReport' }
      ));
    }
  }

  /**
   * 清理错误日志
   */
  async cleanupErrors(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 7;
      
      if (days < 1) {
        res.status(400).json(ErrorResponseUtil.validationError(
          '清理天数必须大于0',
          { days }
        ));
        return;
      }
      
      errorLogger.cleanup();
      
      res.json(ErrorResponseUtil.success({
        message: `已清理${days}天前的错误日志`,
        days
      }, '清理错误日志成功'));
    } catch (error) {
      console.error('清理错误日志失败:', error);
      res.status(500).json(ErrorResponseUtil.systemError(
        error as Error,
        { operation: 'cleanupErrors' }
      ));
    }
  }

  /**
   * 获取错误分析
   */
  async getErrorAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const stats = errorLogger.getErrorStats();
      const issues = ErrorAnalyzer.identifyIssues(stats);
      const patterns = ErrorAnalyzer.analyzePatterns(stats.recentErrors);
      
      // 生成分析建议
      const recommendations = this.generateRecommendations(stats, issues, patterns);
      
      res.json(ErrorResponseUtil.success({
        analysis: {
          issues,
          patterns,
          recommendations,
          riskLevel: this.calculateRiskLevel(stats, issues)
        },
        stats: {
          totalErrors: stats.totalErrors,
          errorRate: stats.errorRate,
          byLevel: stats.byLevel,
          byCategory: stats.byCategory
        }
      }, '获取错误分析成功'));
    } catch (error) {
      console.error('获取错误分析失败:', error);
      res.status(500).json(ErrorResponseUtil.systemError(
        error as Error,
        { operation: 'getErrorAnalysis' }
      ));
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    stats: any,
    issues: any[],
    patterns: any[]
  ): string[] {
    const recommendations = [];
    
    // 基于错误率
    if (stats.errorRate > 0.05) {
      recommendations.push('错误率较高，建议检查系统负载和主要错误来源');
    }
    
    // 基于关键错误
    if (stats.byLevel.CRITICAL > 0) {
      recommendations.push('存在关键错误，需要立即处理');
    }
    
    // 基于数据库错误
    if (stats.byCategory.DATABASE > 10) {
      recommendations.push('数据库错误较多，建议检查数据库连接和性能');
    }
    
    // 基于认证错误
    if (stats.byCategory.AUTHENTICATION > 20) {
      recommendations.push('认证错误较多，建议检查认证配置和用户行为');
    }
    
    // 基于热门错误码
    const topError = stats.topErrorCodes[0];
    if (topError && topError.count > 50) {
      recommendations.push(`错误码${topError.code}出现频率较高，建议优先处理`);
    }
    
    return recommendations;
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(stats: any, issues: any[]): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;
    
    // 错误率评分
    if (stats.errorRate > 0.1) riskScore += 3;
    else if (stats.errorRate > 0.05) riskScore += 2;
    else if (stats.errorRate > 0.01) riskScore += 1;
    
    // 关键错误评分
    if (stats.byLevel.CRITICAL > 0) riskScore += 4;
    if (stats.byLevel.HIGH > 10) riskScore += 2;
    
    // 问题评分
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    
    riskScore += criticalIssues * 3;
    riskScore += highIssues * 2;
    
    // 返回风险等级
    if (riskScore >= 8) return 'critical';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }
}

export const errorController = new ErrorController();

export default ErrorController;