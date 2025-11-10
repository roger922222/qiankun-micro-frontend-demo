/**
 * 简单的导航系统测试
 */

console.log('=== 导航系统测试开始 ===');

// 模拟基本的导航功能
const testNavigation = {
  currentApp: 'main',
  currentPath: '/dashboard',
  history: [],
  
  navigateToApp: function(appName, path, params) {
    console.log(`导航到应用: ${appName}, 路径: ${path}`, params);
    
    const previousRoute = {
      app: this.currentApp,
      path: this.currentPath,
      timestamp: Date.now()
    };
    
    this.history.push(previousRoute);
    this.currentApp = appName;
    this.currentPath = path;
    
    console.log(`当前位置: ${this.currentApp}${this.currentPath}`);
    return true;
  },
  
  goBack: function() {
    if (this.history.length > 0) {
      const previousRoute = this.history.pop();
      this.currentApp = previousRoute.app;
      this.currentPath = previousRoute.path;
      console.log(`返回到: ${this.currentApp}${this.currentPath}`);
      return true;
    }
    console.log('没有历史记录可以返回');
    return false;
  },
  
  getHistory: function() {
    return this.history.slice();
  }
};

// 测试基本导航功能
console.log('\n1. 测试跨应用导航:');
testNavigation.navigateToApp('react-app-1', '/users', { userId: 123 });

console.log('\n2. 测试导航到商品管理:');
testNavigation.navigateToApp('react-app-2', '/products', { category: 'electronics' });

console.log('\n3. 测试导航到订单管理:');
testNavigation.navigateToApp('react-app-3', '/orders', { status: 'pending' });

console.log('\n4. 测试返回功能:');
testNavigation.goBack();

console.log('\n5. 再次返回:');
testNavigation.goBack();

console.log('\n6. 查看导航历史:');
console.log('历史记录:', testNavigation.getHistory());

console.log('\n=== 导航系统测试完成 ===');