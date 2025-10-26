import { AppDataSource } from '../src/config/database';
import { UserService } from '../src/services/userService';
import { performance } from 'perf_hooks';

/**
 * 数据库查询性能测试
 */
class PerformanceTester {
  private userService: UserService;
  private testResults: Map<string, number[]> = new Map();

  constructor() {
    this.userService = new UserService();
  }

  /**
   * 运行所有性能测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 开始数据库查询性能测试...\n');

    try {
      // 等待数据库连接
      await this.waitForDatabase();

      // 运行各项测试
      await this.testUserListQuery();
      await this.testUserByIdQuery();
      await this.testUserSearchQuery();
      await this.testUserCountQueries();

      // 生成测试报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 测试失败:', error);
    }
  }

  /**
   * 等待数据库连接就绪
   */
  private async waitForDatabase(): Promise<void> {
    console.log('⏳ 等待数据库连接...');
    
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      try {
        // 尝试执行一个简单的查询来测试连接
        await this.userService.getUsers({ page: 1, pageSize: 1 });
        console.log('✅ 数据库连接就绪\n');
        return;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error('数据库连接超时');
        }
        await this.delay(1000);
      }
    }
  }

  /**
   * 测试用户列表查询性能
   */
  private async testUserListQuery(): Promise<void> {
    console.log('📊 测试用户列表查询性能...');
    
    const testCases = [
      { page: 1, pageSize: 10, name: '小数据量(10条)' },
      { page: 1, pageSize: 50, name: '中等数据量(50条)' },
      { page: 1, pageSize: 100, name: '大数据量(100条)' },
    ];

    for (const testCase of testCases) {
      const times: number[] = [];
      
      // 预热缓存
      await this.userService.getUsers(testCase);
      await this.delay(100);

      // 执行多次测试
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await this.userService.getUsers(testCase);
        const endTime = performance.now();
        times.push(endTime - startTime);
        await this.delay(50); // 短暂延迟避免过载
      }

      this.testResults.set(`用户列表-${testCase.name}`, times);
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`  ${testCase.name}: 平均 ${avgTime.toFixed(2)}ms`);
    }
    
    console.log('');
  }

  /**
   * 测试用户详情查询性能
   */
  private async testUserByIdQuery(): Promise<void> {
    console.log('👤 测试用户详情查询性能...');
    
    // 先获取一个用户ID
    const usersResult = await this.userService.getUsers({ page: 1, pageSize: 1 });
    if (!usersResult.data || usersResult.data.length === 0) {
      console.log('⚠️  没有用户数据，跳过此测试\n');
      return;
    }

    const userId = usersResult.data[0].id;
    const times: number[] = [];

    // 预热缓存
    await this.userService.getUserById(userId);
    await this.delay(100);

    // 执行多次测试
    for (let i = 0; i < 20; i++) {
      const startTime = performance.now();
      await this.userService.getUserById(userId);
      const endTime = performance.now();
      times.push(endTime - startTime);
      await this.delay(50);
    }

    this.testResults.set('用户详情查询', times);
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  平均响应时间: ${avgTime.toFixed(2)}ms`);
    console.log('');
  }

  /**
   * 测试用户搜索查询性能
   */
  private async testUserSearchQuery(): Promise<void> {
    console.log('🔍 测试用户搜索查询性能...');
    
    const searchTerms = [
      { keyword: 'admin', name: '精确搜索' },
      { keyword: 'a', name: '单字符搜索' },
      { keyword: 'test', name: '普通搜索' },
    ];

    for (const searchCase of searchTerms) {
      const times: number[] = [];

      // 预热缓存
      await this.userService.getUsers({ keyword: searchCase.keyword, page: 1, pageSize: 20 });
      await this.delay(100);

      // 执行多次测试
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await this.userService.getUsers({ keyword: searchCase.keyword, page: 1, pageSize: 20 });
        const endTime = performance.now();
        times.push(endTime - startTime);
        await this.delay(50);
      }

      this.testResults.set(`用户搜索-${searchCase.name}`, times);
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`  ${searchCase.name}: 平均 ${avgTime.toFixed(2)}ms`);
    }
    
    console.log('');
  }

  /**
   * 测试用户统计查询性能
   */
  private async testUserCountQueries(): Promise<void> {
    console.log('📈 测试用户统计查询性能...');
    
    // 注意：这里假设UserRepository中有countByStatus和countByRole方法
    // 实际测试中需要根据具体的Repository实现来调整
    
    const times: number[] = [];

    // 执行多次测试（模拟统计查询）
    for (let i = 0; i < 15; i++) {
      const startTime = performance.now();
      
      // 模拟统计查询
      await this.userService.getUsers({ page: 1, pageSize: 1 });
      
      const endTime = performance.now();
      times.push(endTime - startTime);
      await this.delay(50);
    }

    this.testResults.set('用户统计查询', times);
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  平均响应时间: ${avgTime.toFixed(2)}ms`);
    console.log('');
  }

  /**
   * 生成测试报告
   */
  private generateReport(): void {
    console.log('📋 性能测试报告');
    console.log('=' .repeat(50));
    
    let totalTests = 0;
    let totalTime = 0;

    this.testResults.forEach((times, testName) => {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`\n${testName}:`);
      console.log(`  测试次数: ${times.length}`);
      console.log(`  平均时间: ${avgTime.toFixed(2)}ms`);
      console.log(`  最短时间: ${minTime.toFixed(2)}ms`);
      console.log(`  最长时间: ${maxTime.toFixed(2)}ms`);
      
      totalTests += times.length;
      totalTime += times.reduce((a, b) => a + b, 0);
    });

    console.log('\n' + '='.repeat(50));
    console.log(`总计: ${totalTests} 次测试`);
    console.log(`总耗时: ${totalTime.toFixed(2)}ms`);
    console.log(`整体平均: ${(totalTime / totalTests).toFixed(2)}ms`);
    
    // 性能评估
    const overallAvg = totalTime / totalTests;
    console.log('\n性能评估:');
    if (overallAvg < 50) {
      console.log('🟢 优秀 - 查询性能非常好');
    } else if (overallAvg < 100) {
      console.log('🟡 良好 - 查询性能良好');
    } else if (overallAvg < 200) {
      console.log('🟠 一般 - 查询性能需要优化');
    } else {
      console.log('🔴 较差 - 查询性能需要紧急优化');
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 主函数
 */
async function main() {
  const tester = new PerformanceTester();
  await tester.runAllTests();
  
  // 退出程序
  process.exit(0);
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('未处理的Promise拒绝:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  main().catch((error) => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

export default PerformanceTester;