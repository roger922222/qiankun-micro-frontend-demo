# 微前端通信系统测试验证方案

## 1. 测试策略概览

### 1.1 测试金字塔

```mermaid
graph TB
    subgraph "测试金字塔"
        E2E[端到端测试<br/>E2E Tests<br/>10%]
        INT[集成测试<br/>Integration Tests<br/>20%]
        UNIT[单元测试<br/>Unit Tests<br/>70%]
    end
    
    subgraph "测试范围"
        E2E --> E2E_SCOPE[用户场景<br/>跨应用流程<br/>完整业务链路]
        INT --> INT_SCOPE[应用间通信<br/>API集成<br/>组件集成]
        UNIT --> UNIT_SCOPE[函数逻辑<br/>组件行为<br/>工具函数]
    end
    
    subgraph "测试工具"
        E2E_SCOPE --> E2E_TOOLS[Cypress<br/>Playwright<br/>Puppeteer]
        INT_SCOPE --> INT_TOOLS[Jest<br/>Testing Library<br/>MSW]
        UNIT_SCOPE --> UNIT_TOOLS[Jest<br/>Vitest<br/>Testing Library]
    end
```

### 1.2 测试分类

| 测试类型 | 测试范围 | 工具选择 | 执行频率 | 覆盖率目标 |
|----------|----------|----------|----------|------------|
| **单元测试** | 函数、组件、工具类 | Jest + Testing Library | 每次提交 | 90%+ |
| **集成测试** | 模块间交互、API调用 | Jest + MSW | 每次合并 | 80%+ |
| **组件测试** | 组件渲染、交互 | Testing Library | 每次提交 | 85%+ |
| **通信测试** | 应用间通信、事件传递 | 自定义测试框架 | 每次合并 | 95%+ |
| **端到端测试** | 完整用户流程 | Cypress | 每日构建 | 关键路径100% |
| **性能测试** | 加载性能、运行性能 | Lighthouse + K6 | 每周 | 性能基准 |
| **兼容性测试** | 浏览器兼容性 | BrowserStack | 发版前 | 主流浏览器 |

## 2. 单元测试

### 2.1 事件总线测试

```typescript
// tests/unit/event-bus.test.ts
import { EventBus } from '../../shared/communication/event-bus';
import { BaseEvent } from '../../shared/types/events';

describe('EventBus', () => {
  let eventBus: EventBus;
  
  beforeEach(() => {
    eventBus = new EventBus();
  });
  
  afterEach(() => {
    eventBus.removeAllListeners();
  });
  
  describe('基础功能', () => {
    it('应该能够发射和监听事件', () => {
      const mockHandler = jest.fn();
      const testEvent: BaseEvent = {
        type: 'TEST_EVENT',
        source: 'test',
        timestamp: new Date().toISOString(),
        id: 'test-1',
        data: { message: 'hello' }
      };
      
      eventBus.on('TEST_EVENT', mockHandler);
      eventBus.emit(testEvent);
      
      expect(mockHandler).toHaveBeenCalledWith(testEvent);
    });
    
    it('应该能够取消事件监听', () => {
      const mockHandler = jest.fn();
      const subscription = eventBus.on('TEST_EVENT', mockHandler);
      
      subscription.unsubscribe();
      
      eventBus.emit({
        type: 'TEST_EVENT',
        source: 'test',
        timestamp: new Date().toISOString(),
        id: 'test-2',
        data: {}
      });
      
      expect(mockHandler).not.toHaveBeenCalled();
    });
    
    it('应该支持通配符监听', () => {
      const mockHandler = jest.fn();
      
      eventBus.on('*', mockHandler);
      
      eventBus.emit({
        type: 'ANY_EVENT',
        source: 'test',
        timestamp: new Date().toISOString(),
        id: 'test-3',
        data: {}
      });
      
      expect(mockHandler).toHaveBeenCalled();
    });
  });
  
  describe('错误处理', () => {
    it('应该处理监听器中的错误', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();
      
      eventBus.on('ERROR_EVENT', errorHandler);
      eventBus.on('ERROR_EVENT', normalHandler);
      
      expect(() => {
        eventBus.emit({
          type: 'ERROR_EVENT',
          source: 'test',
          timestamp: new Date().toISOString(),
          id: 'test-4',
          data: {}
        });
      }).not.toThrow();
      
      expect(normalHandler).toHaveBeenCalled();
    });
    
    it('应该验证事件格式', () => {
      expect(() => {
        eventBus.emit({} as BaseEvent);
      }).toThrow('Invalid event structure');
    });
  });
  
  describe('性能测试', () => {
    it('应该能够处理大量事件', () => {
      const mockHandler = jest.fn();
      eventBus.on('PERFORMANCE_EVENT', mockHandler);
      
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        eventBus.emit({
          type: 'PERFORMANCE_EVENT',
          source: 'test',
          timestamp: new Date().toISOString(),
          id: `perf-${i}`,
          data: { index: i }
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
      expect(mockHandler).toHaveBeenCalledTimes(10000);
    });
  });
});
```

### 2.2 状态管理测试

```typescript
// tests/unit/state-manager.test.ts
import { GlobalStateManager } from '../../shared/communication/state-manager';
import { GlobalState } from '../../shared/types/state';

describe('GlobalStateManager', () => {
  let stateManager: GlobalStateManager;
  
  beforeEach(() => {
    stateManager = new GlobalStateManager();
  });
  
  describe('状态管理', () => {
    it('应该能够设置和获取状态', () => {
      const initialState: Partial<GlobalState> = {
        user: {
          currentUser: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com'
          },
          permissions: ['read', 'write']
        }
      };
      
      stateManager.setState(initialState);
      const state = stateManager.getState();
      
      expect(state.user.currentUser?.name).toBe('Test User');
      expect(state.user.permissions).toContain('read');
    });
    
    it('应该能够订阅状态变更', () => {
      const mockListener = jest.fn();
      
      stateManager.subscribe(mockListener);
      
      stateManager.setState({
        theme: { mode: 'dark' }
      });
      
      expect(mockListener).toHaveBeenCalled();
    });
    
    it('应该支持路径订阅', () => {
      const mockListener = jest.fn();
      
      stateManager.subscribePath('user.currentUser', mockListener);
      
      stateManager.setState({
        user: {
          currentUser: {
            id: '2',
            name: 'New User',
            email: 'new@example.com'
          },
          permissions: []
        }
      });
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New User' }),
        undefined
      );
    });
  });
  
  describe('状态验证', () => {
    it('应该验证状态结构', () => {
      const validator = jest.fn().mockReturnValue(false);
      
      stateManager.addValidator('user', validator);
      
      expect(() => {
        stateManager.setState({
          user: { invalid: 'data' }
        });
      }).toThrow('State validation failed');
    });
  });
  
  describe('状态历史', () => {
    it('应该记录状态历史', () => {
      stateManager.setState({ theme: { mode: 'light' } });
      stateManager.setState({ theme: { mode: 'dark' } });
      
      const history = stateManager.getStateHistory();
      
      expect(history).toHaveLength(2);
    });
    
    it('应该支持时间旅行', () => {
      stateManager.setState({ theme: { mode: 'light' } });
      stateManager.setState({ theme: { mode: 'dark' } });
      
      const history = stateManager.getStateHistory();
      const firstSnapshot = history[0];
      
      stateManager.timeTravel(firstSnapshot.id);
      
      const currentState = stateManager.getState();
      expect(currentState.theme?.mode).toBe('light');
    });
  });
});
```

### 2.3 路由管理测试

```typescript
// tests/unit/route-manager.test.ts
import { RouteManager } from '../../shared/communication/route-manager';
import { NavigationRequest } from '../../shared/types/routing';

// Mock history API
const mockPushState = jest.fn();
const mockReplaceState = jest.fn();

Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
    replaceState: mockReplaceState,
    length: 1,
    state: null
  },
  writable: true
});

describe('RouteManager', () => {
  let routeManager: RouteManager;
  
  beforeEach(() => {
    routeManager = new RouteManager();
    mockPushState.mockClear();
    mockReplaceState.mockClear();
  });
  
  describe('路由导航', () => {
    it('应该能够执行基本导航', async () => {
      const request: NavigationRequest = {
        to: '/user-management',
        from: '/',
        params: { id: '123' },
        query: { tab: 'profile' }
      };
      
      const result = await routeManager.navigate(request);
      
      expect(result).toBe(true);
      expect(mockPushState).toHaveBeenCalledWith(
        undefined,
        '',
        '/user-management'
      );
    });
    
    it('应该支持替换导航', async () => {
      const request: NavigationRequest = {
        to: '/login',
        from: '/protected',
        replace: true
      };
      
      await routeManager.navigate(request);
      
      expect(mockReplaceState).toHaveBeenCalledWith(
        undefined,
        '',
        '/login'
      );
    });
  });
  
  describe('路由守卫', () => {
    it('应该执行路由守卫验证', async () => {
      const mockGuard = {
        canActivate: jest.fn().mockResolvedValue({ canActivate: false, message: 'Access denied' })
      };
      
      routeManager.addGuard(mockGuard);
      
      const result = await routeManager.navigate({
        to: '/admin',
        from: '/'
      });
      
      expect(result).toBe(false);
      expect(mockGuard.canActivate).toHaveBeenCalled();
    });
    
    it('应该支持守卫重定向', async () => {
      const mockGuard = {
        canActivate: jest.fn().mockResolvedValue({
          canActivate: false,
          redirectTo: '/login'
        })
      };
      
      routeManager.addGuard(mockGuard);
      
      await routeManager.navigate({
        to: '/protected',
        from: '/'
      });
      
      expect(mockReplaceState).toHaveBeenCalledWith(
        undefined,
        '',
        '/login'
      );
    });
  });
  
  describe('路由历史', () => {
    it('应该记录路由历史', async () => {
      await routeManager.navigate({
        to: '/page1',
        from: '/'
      });
      
      await routeManager.navigate({
        to: '/page2',
        from: '/page1'
      });
      
      const history = routeManager.getRouteHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].to).toBe('/page1');
      expect(history[1].to).toBe('/page2');
    });
    
    it('应该支持返回上一页', async () => {
      await routeManager.navigate({
        to: '/page1',
        from: '/'
      });
      
      await routeManager.navigate({
        to: '/page2',
        from: '/page1'
      });
      
      const result = await routeManager.goBack();
      
      expect(result).toBe(true);
      expect(mockReplaceState).toHaveBeenLastCalledWith(
        undefined,
        '',
        '/page1'
      );
    });
  });
});
```

## 3. 集成测试

### 3.1 应用间通信测试

```typescript
// tests/integration/app-communication.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { registerMicroApps, start } from 'qiankun';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock微应用
const mockMicroApps = [
  {
    name: 'user-management',
    entry: 'http://localhost:3001',
    container: '#user-management-container',
    activeRule: '/user-management'
  }
];

// Mock服务器
const server = setupServer(
  rest.get('http://localhost:3001', (req, res, ctx) => {
    return res(
      ctx.html(`
        <div id="user-management-app">
          <h1>User Management</h1>
          <button id="send-event-btn">Send Event</button>
        </div>
        <script>
          window.addEventListener('message', (event) => {
            if (event.data.type === 'GLOBAL_STATE_CHANGED') {
              console.log('Received state change:', event.data);
            }
          });
          
          document.getElementById('send-event-btn').addEventListener('click', () => {
            window.parent.postMessage({
              type: 'USER_UPDATED',
              data: { userId: '123', name: 'Updated User' }
            }, '*');
          });
        </script>
      `)
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('应用间通信集成测试', () => {
  let mainApp: any;
  
  beforeEach(async () => {
    // 设置主应用
    document.body.innerHTML = `
      <div id="main-app">
        <div id="user-management-container"></div>
      </div>
    `;
    
    // 注册微应用
    registerMicroApps(mockMicroApps);
    
    // 启动qiankun
    start();
    
    // 等待应用加载
    await waitFor(() => {
      expect(document.querySelector('#user-management-app')).toBeInTheDocument();
    });
  });
  
  it('应该能够从主应用向微应用发送状态更新', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    // 模拟主应用状态更新
    const stateChangeEvent = new MessageEvent('message', {
      data: {
        type: 'GLOBAL_STATE_CHANGED',
        data: {
          user: { currentUser: { id: '1', name: 'Test User' } }
        }
      }
    });
    
    window.dispatchEvent(stateChangeEvent);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Received state change:',
        expect.objectContaining({
          type: 'GLOBAL_STATE_CHANGED'
        })
      );
    });
    
    consoleSpy.mockRestore();
  });
  
  it('应该能够从微应用向主应用发送事件', async () => {
    const messageHandler = jest.fn();
    
    window.addEventListener('message', messageHandler);
    
    // 模拟微应用发送事件
    const sendEventBtn = document.querySelector('#send-event-btn');
    fireEvent.click(sendEventBtn!);
    
    await waitFor(() => {
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            type: 'USER_UPDATED',
            data: { userId: '123', name: 'Updated User' }
          }
        })
      );
    });
    
    window.removeEventListener('message', messageHandler);
  });
  
  it('应该能够处理应用加载失败', async () => {
    // 模拟应用加载失败
    server.use(
      rest.get('http://localhost:3002', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const errorHandler = jest.fn();
    window.addEventListener('qiankun:app-error', errorHandler);
    
    registerMicroApps([{
      name: 'failed-app',
      entry: 'http://localhost:3002',
      container: '#failed-container',
      activeRule: '/failed'
    }]);
    
    // 触发应用加载
    window.history.pushState(null, '', '/failed');
    
    await waitFor(() => {
      expect(errorHandler).toHaveBeenCalled();
    });
    
    window.removeEventListener('qiankun:app-error', errorHandler);
  });
});
```

### 3.2 数据同步测试

```typescript
// tests/integration/data-sync.test.ts
import { DataSyncManager } from '../../shared/communication/data-sync';
import { EventBus } from '../../shared/communication/event-bus';

describe('数据同步集成测试', () => {
  let dataSyncManager: DataSyncManager;
  let eventBus: EventBus;
  
  beforeEach(() => {
    eventBus = new EventBus();
    dataSyncManager = new DataSyncManager();
  });
  
  it('应该能够同步用户数据到多个应用', async () => {
    const mockStrategy = {
      sync: jest.fn().mockResolvedValue(undefined),
      getCurrentData: jest.fn().mockResolvedValue(null)
    };
    
    dataSyncManager.registerStrategy('user', mockStrategy);
    
    const userData = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      updatedAt: new Date().toISOString()
    };
    
    await dataSyncManager.syncData('user', userData, 'user-management');
    
    expect(mockStrategy.sync).toHaveBeenCalledWith(userData, 'user-management');
  });
  
  it('应该能够处理数据冲突', async () => {
    const existingData = {
      id: '1',
      name: 'Existing User',
      version: 2,
      updatedAt: new Date().toISOString()
    };
    
    const incomingData = {
      id: '1',
      name: 'Updated User',
      version: 1,
      updatedAt: new Date(Date.now() - 1000).toISOString()
    };
    
    const mockStrategy = {
      sync: jest.fn().mockResolvedValue(undefined),
      getCurrentData: jest.fn().mockResolvedValue(existingData)
    };
    
    const mockResolver = {
      resolve: jest.fn().mockResolvedValue(existingData)
    };
    
    dataSyncManager.registerStrategy('user', mockStrategy);
    dataSyncManager.registerConflictResolver('user', mockResolver);
    
    await dataSyncManager.syncData('user', incomingData, 'product-management');
    
    expect(mockResolver.resolve).toHaveBeenCalledWith({
      type: 'version',
      currentData: existingData,
      incomingData: incomingData,
      message: 'Incoming data has lower version'
    });
    
    expect(mockStrategy.sync).toHaveBeenCalledWith(existingData, 'product-management');
  });
  
  it('应该能够处理并发同步请求', async () => {
    const mockStrategy = {
      sync: jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      ),
      getCurrentData: jest.fn().mockResolvedValue(null)
    };
    
    dataSyncManager.registerStrategy('user', mockStrategy);
    
    const syncPromises = [];
    
    for (let i = 0; i < 5; i++) {
      syncPromises.push(
        dataSyncManager.syncData('user', { id: i.toString() }, 'test-app')
      );
    }
    
    await Promise.all(syncPromises);
    
    expect(mockStrategy.sync).toHaveBeenCalledTimes(5);
  });
});
```

## 4. 端到端测试

### 4.1 Cypress测试配置

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      coverage: true
    },
    setupNodeEvents(on, config) {
      // 代码覆盖率插件
      require('@cypress/code-coverage/task')(on, config);
      
      // 自定义任务
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        // 数据库种子数据
        seedDatabase() {
          // 插入测试数据
          return null;
        },
        
        // 清理数据库
        clearDatabase() {
          // 清理测试数据
          return null;
        }
      });
      
      return config;
    }
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}'
  }
});
```

### 4.2 用户流程测试

```typescript
// cypress/e2e/user-management-flow.cy.ts
describe('用户管理完整流程', () => {
  beforeEach(() => {
    // 设置测试数据
    cy.task('seedDatabase');
    
    // 访问主应用
    cy.visit('/');
    
    // 登录
    cy.login('admin@example.com', 'password');
  });
  
  afterEach(() => {
    // 清理测试数据
    cy.task('clearDatabase');
  });
  
  it('应该能够完成用户CRUD操作流程', () => {
    // 导航到用户管理
    cy.get('[data-testid="nav-user-management"]').click();
    
    // 验证微应用加载
    cy.url().should('include', '/user-management');
    cy.get('[data-testid="user-management-app"]').should('be.visible');
    
    // 创建新用户
    cy.get('[data-testid="create-user-btn"]').click();
    cy.get('[data-testid="user-form"]').should('be.visible');
    
    cy.get('[data-testid="user-name-input"]').type('Test User');
    cy.get('[data-testid="user-email-input"]').type('testuser@example.com');
    cy.get('[data-testid="user-role-select"]').select('user');
    
    cy.get('[data-testid="save-user-btn"]').click();
    
    // 验证用户创建成功
    cy.get('[data-testid="success-message"]').should('contain', '用户创建成功');
    cy.get('[data-testid="user-list"]').should('contain', 'Test User');
    
    // 编辑用户
    cy.get('[data-testid="user-row"]').contains('Test User').within(() => {
      cy.get('[data-testid="edit-user-btn"]').click();
    });
    
    cy.get('[data-testid="user-name-input"]').clear().type('Updated Test User');
    cy.get('[data-testid="save-user-btn"]').click();
    
    // 验证用户更新成功
    cy.get('[data-testid="success-message"]').should('contain', '用户更新成功');
    cy.get('[data-testid="user-list"]').should('contain', 'Updated Test User');
    
    // 删除用户
    cy.get('[data-testid="user-row"]').contains('Updated Test User').within(() => {
      cy.get('[data-testid="delete-user-btn"]').click();
    });
    
    cy.get('[data-testid="confirm-dialog"]').within(() => {
      cy.get('[data-testid="confirm-btn"]').click();
    });
    
    // 验证用户删除成功
    cy.get('[data-testid="success-message"]').should('contain', '用户删除成功');
    cy.get('[data-testid="user-list"]').should('not.contain', 'Updated Test User');
  });
  
  it('应该能够处理跨应用的用户数据同步', () => {
    // 在用户管理中更新用户信息
    cy.visit('/user-management');
    cy.get('[data-testid="user-row"]').first().within(() => {
      cy.get('[data-testid="edit-user-btn"]').click();
    });
    
    cy.get('[data-testid="user-name-input"]').clear().type('Synchronized User');
    cy.get('[data-testid="save-user-btn"]').click();
    
    // 切换到订单管理，验证用户信息同步
    cy.get('[data-testid="nav-order-management"]').click();
    cy.url().should('include', '/order-management');
    
    // 验证用户信息已同步
    cy.get('[data-testid="user-info"]').should('contain', 'Synchronized User');
  });
  
  it('应该能够处理应用加载失败的情况', () => {
    // 模拟网络错误
    cy.intercept('GET', '**/user-management/**', { forceNetworkError: true });
    
    cy.get('[data-testid="nav-user-management"]').click();
    
    // 验证错误处理
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', '应用加载失败');
    
    // 验证重试功能
    cy.get('[data-testid="retry-btn"]').click();
    
    // 恢复网络
    cy.intercept('GET', '**/user-management/**').as('loadApp');
    cy.wait('@loadApp');
    
    // 验证应用正常加载
    cy.get('[data-testid="user-management-app"]').should('be.visible');
  });
});
```

### 4.3 性能测试

```typescript
// cypress/e2e/performance.cy.ts
describe('性能测试', () => {
  it('应该在合理时间内加载主应用', () => {
    const startTime = Date.now();
    
    cy.visit('/');
    
    cy.get('[data-testid="main-app"]').should('be.visible').then(() => {
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(3000); // 3秒内加载完成
    });
  });
  
  it('应该在合理时间内加载微应用', () => {
    cy.visit('/');
    
    const startTime = Date.now();
    
    cy.get('[data-testid="nav-user-management"]').click();
    
    cy.get('[data-testid="user-management-app"]').should('be.visible').then(() => {
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(2000); // 2秒内加载完成
    });
  });
  
  it('应该能够处理大量数据渲染', () => {
    // 创建大量测试数据
    cy.task('seedDatabase', { userCount: 1000 });
    
    cy.visit('/user-management');
    
    // 验证虚拟滚动或分页
    cy.get('[data-testid="user-list"]').should('be.visible');
    cy.get('[data-testid="user-row"]').should('have.length.at.most', 50); // 分页显示
    
    // 测试滚动性能
    cy.get('[data-testid="user-list"]').scrollTo('bottom');
    cy.get('[data-testid="load-more-btn"]').should('be.visible');
  });
  
  it('应该能够测量Core Web Vitals', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // 注入性能监控代码
        win.webVitals = {
          LCP: null,
          FID: null,
          CLS: null
        };
      }
    });
    
    // 等待页面加载完成
    cy.get('[data-testid="main-app"]').should('be.visible');
    
    // 执行一些交互
    cy.get('[data-testid="nav-user-management"]').click();
    cy.get('[data-testid="user-management-app"]').should('be.visible');
    
    // 验证性能指标
    cy.window().its('webVitals').then((vitals) => {
      // LCP (Largest Contentful Paint) 应该小于2.5秒
      expect(vitals.LCP).to.be.lessThan(2500);
      
      // FID (First Input Delay) 应该小于100毫秒
      expect(vitals.FID).to.be.lessThan(100);
      
      // CLS (Cumulative Layout Shift) 应该小于0.1
      expect(vitals.CLS).to.be.lessThan(0.1);
    });
  });
});
```

## 5. 性能测试

### 5.1 Lighthouse CI配置

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/user-management',
        'http://localhost:3000/product-management',
        'http://localhost:3000/order-management'
      ],
      startServerCommand: 'npm run start',
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': ['warn', { minScore: 0.6 }],
        
        // 自定义指标
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // 资源优化
        'unused-css-rules': ['warn', { maxLength: 0 }],
        'unused-javascript': ['warn', { maxLength: 0 }],
        'modern-image-formats': ['warn', { maxLength: 0 }],
        'offscreen-images': ['warn', { maxLength: 0 }]
      }
    },
    upload: {
      target: 'lhci',
      serverBaseUrl: 'https://lhci.example.com',
      token: process.env.LHCI_TOKEN
    }
  }
};
```

### 5.2 K6负载测试

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // 启动阶段
    { duration: '5m', target: 50 }, // 负载增长
    { duration: '10m', target: 100 }, // 稳定负载
    { duration: '5m', target: 200 }, // 峰值负载
    { duration: '5m', target: 0 }, // 逐步减少
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的请求应在500ms内完成
    http_req_failed: ['rate<0.1'], // 错误率应低于10%
    errors: ['rate<0.1'],
  },
};

export default function() {
  // 测试主应用加载
  const mainAppResponse = http.get('http://localhost:3000');
  check(mainAppResponse, {
    'main app status is 200': (r) => r.status === 200,
    'main app loads in <2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // 测试微应用加载
  const microApps = [
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003'
  ];
  
  microApps.forEach((url) => {
    const response = http.get(url);
    check(response, {
      [`${url} status is 200`]: (r) => r.status === 200,
      [`${url} loads in <1s`]: (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
  });
  
  sleep(1);
  
  // 测试API端点
  const apiResponse = http.get('http://localhost:3000/api/health');
  check(apiResponse, {
    'api status is 200': (r) => r.status === 200,
    'api response time <100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);
  
  sleep(2);
}

// 压力测试场景
export function stressTest() {
  const response = http.get('http://localhost:3000');
  check(response, {
    'stress test status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
}

// 峰值测试配置
export const stressOptions = {
  executor: 'ramping-arrival-rate',
  startRate: 0,
  timeUnit: '1s',
  preAllocatedVUs: 50,
  maxVUs: 500,
  stages: [
    { target: 10, duration: '1m' },
    { target: 50, duration: '2m' },
    { target: 100, duration: '2m' },
    { target: 200, duration: '2m' },
    { target: 0, duration: '1m' },
  ],
};
```

## 6. 自动化测试流水线

### 6.1 GitHub Actions配置

```yaml
# .github/workflows/test.yml
name: 测试流水线

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8'

jobs:
  # 单元测试和集成测试
  unit-integration-tests:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
        env:
          MONGO_INITDB_ROOT_USERNAME: test
          MONGO_INITDB_ROOT_PASSWORD: test
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v3
      
      - name: 设置Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: 安装pnpm
        run: npm install -g pnpm@${{ env.PNPM_VERSION }}
      
      - name: 安装依赖
        run: pnpm install --frozen-lockfile
      
      - name: 代码检查
        run: |
          pnpm run lint
          pnpm run type-check
      
      - name: 单元测试
        run: pnpm run test:unit --coverage
        env:
          REDIS_URL: redis://localhost:6379
          MONGODB_URI: mongodb://test:test@localhost:27017/test
      
      - name: 集成测试
        run: pnpm run test:integration --coverage
        env:
          REDIS_URL: redis://localhost:6379
          MONGODB_URI: mongodb://test:test@localhost:27017/test
      
      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unit-integration
          name: unit-integration-coverage
  
  # 端到端测试
  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-integration-tests
    
    strategy:
      matrix:
        browser: [chrome, firefox, edge]
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v3
      
      - name: 设置Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: 安装pnpm
        run: npm install -g pnpm@${{ env.PNPM_VERSION }}
      
      - name: 安装依赖
        run: pnpm install --frozen-lockfile
      
      - name: 构建应用
        run: pnpm run build
      
      - name: 启动应用
        run: |
          pnpm run start:e2e &
          sleep 30
      
      - name: 运行Cypress测试
        uses: cypress-io/github-action@v5
        with:
          browser: ${{ matrix.browser }}
          wait-on: 'http://localhost:3000'
          wait-on-timeout: 120
          record: true
          parallel: true
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: 上传测试结果
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots-${{ matrix.browser }}
          path: cypress/screenshots
      
      - name: 上传测试视频
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-videos-${{ matrix.browser }}
          path: cypress/videos
  
  # 性能测试
  performance-tests:
    runs-on: ubuntu-latest
    needs: unit-integration-tests
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v3
      
      - name: 设置Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: 安装pnpm
        run: npm install -g pnpm@${{ env.PNPM_VERSION }}
      
      - name: 安装依赖
        run: pnpm install --frozen-lockfile
      
      - name: 构建应用
        run: pnpm run build
      
      - name: 启动应用
        run: |
          pnpm run start &
          sleep 30
      
      - name: 运行Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      
      - name: 安装K6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: 运行K6负载测试
        run: k6 run tests/performance/load-test.js
      
      - name: 上传性能报告
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: |
            .lighthouseci/
            k6-results.json
  
  # 兼容性测试
  compatibility-tests:
    runs-on: ubuntu-latest
    needs: unit-integration-tests
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v3
      
      - name: 设置Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: 安装pnpm
        run: npm install -g pnpm@${{ env.PNPM_VERSION }}
      
      - name: 安装依赖
        run: pnpm install --frozen-lockfile
      
      - name: 构建应用
        run: pnpm run build
      
      - name: BrowserStack测试
        run: pnpm run test:browserstack
        env:
          BROWSERSTACK_USERNAME: ${{ secrets.BROWSERSTACK_USERNAME }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
  
  # 测试报告汇总
  test-summary:
    runs-on: ubuntu-latest
    needs: [unit-integration-tests, e2e-tests, performance-tests, compatibility-tests]
    if: always()
    
    steps:
      - name: 下载测试结果
        uses: actions/download-artifact@v3
      
      - name: 生成测试报告
        run: |
          echo "# 测试报告" > test-report.md
          echo "" >> test-report.md
          echo "## 测试结果汇总" >> test-report.md
          echo "- 单元测试: ${{ needs.unit-integration-tests.result }}" >> test-report.md
          echo "- 端到端测试: ${{ needs.e2e-tests.result }}" >> test-report.md
          echo "- 性能测试: ${{ needs.performance-tests.result }}" >> test-report.md
          echo "- 兼容性测试: ${{ needs.compatibility-tests.result }}" >> test-report.md
      
      - name: 发布测试报告
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: test-report.md
```

### 6.2 测试数据管理

```typescript
// tests/utils/test-data.ts
import { faker } from '@faker-js/faker';

// 用户测试数据生成器
export class UserTestDataGenerator {
  static generateUser(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: faker.helpers.arrayElement(['admin', 'user', 'manager']),
      status: faker.helpers.arrayElement(['active', 'inactive']),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides
    };
  }
  
  static generateUsers(count: number): User[] {
    return Array.from({ length: count }, () => this.generateUser());
  }
  
  static generateUserWithPermissions(permissions: string[]): User {
    return {
      ...this.generateUser(),
      permissions
    };
  }
}

// 产品测试数据生成器
export class ProductTestDataGenerator {
  static generateProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: faker.string.uuid(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      category: faker.commerce.department(),
      sku: faker.string.alphanumeric(8).toUpperCase(),
      stock: faker.number.int({ min: 0, max: 1000 }),
      status: faker.helpers.arrayElement(['active', 'inactive', 'discontinued']),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides
    };
  }
  
  static generateProducts(count: number): Product[] {
    return Array.from({ length: count }, () => this.generateProduct());
  }
}

// 订单测试数据生成器
export class OrderTestDataGenerator {
  static generateOrder(overrides: Partial<Order> = {}): Order {
    const userId = faker.string.uuid();
    const products = ProductTestDataGenerator.generateProducts(
      faker.number.int({ min: 1, max: 5 })
    );
    
    return {
      id: faker.string.uuid(),
      userId,
      products: products.map(product => ({
        productId: product.id,
        quantity: faker.number.int({ min: 1, max: 10 }),
        price: product.price
      })),
      total: products.reduce((sum, product) => sum + product.price, 0),
      status: faker.helpers.arrayElement(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
      shippingAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country()
      },
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides
    };
  }
  
  static generateOrders(count: number): Order[] {
    return Array.from({ length: count }, () => this.generateOrder());
  }
}

// 测试数据库管理器
export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  
  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }
  
  async seedDatabase(): Promise<void> {
    // 清理现有数据
    await this.clearDatabase();
    
    // 生成测试数据
    const users = UserTestDataGenerator.generateUsers(50);
    const products = ProductTestDataGenerator.generateProducts(100);
    const orders = OrderTestDataGenerator.generateOrders(200);
    
    // 插入数据
    await this.insertUsers(users);
    await this.insertProducts(products);
    await this.insertOrders(orders);
  }
  
  async clearDatabase(): Promise<void> {
    // 清理所有测试数据
    await this.clearUsers();
    await this.clearProducts();
    await this.clearOrders();
  }
  
  private async insertUsers(users: User[]): Promise<void> {
    // 实现用户数据插入逻辑
  }
  
  private async insertProducts(products: Product[]): Promise<void> {
    // 实现产品数据插入逻辑
  }
  
  private async insertOrders(orders: Order[]): Promise<void> {
    // 实现订单数据插入逻辑
  }
  
  private async clearUsers(): Promise<void> {
    // 实现用户数据清理逻辑
  }
  
  private async clearProducts(): Promise<void> {
    // 实现产品数据清理逻辑
  }
  
  private async clearOrders(): Promise<void> {
    // 实现订单数据清理逻辑
  }
}
```

## 7. 测试报告和指标

### 7.1 测试覆盖率配置

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'shared/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './shared/communication/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.test.{ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ]
};
```

### 7.2 测试报告生成器

```typescript
// tests/utils/test-reporter.ts
import fs from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
  test: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

export class TestReporter {
  private results: TestResult[] = [];
  private startTime: number = Date.now();
  
  addResult(result: TestResult): void {
    this.results.push(result);
  }
  
  generateSummary(): TestSummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const duration = Date.now() - this.startTime;
    
    // 读取覆盖率报告
    const coverage = this.readCoverageReport();
    
    return {
      total,
      passed,
      failed,
      skipped,
      duration,
      coverage
    };
  }
  
  generateHTMLReport(): string {
    const summary = this.generateSummary();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Qiankun微前端测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .metric-label { font-size: 14px; color: #666; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .test-results { margin-top: 20px; }
        .test-result { padding: 10px; border-left: 4px solid #ccc; margin-bottom: 10px; }
        .test-result.passed { border-left-color: #28a745; }
        .test-result.failed { border-left-color: #dc3545; background: #f8d7da; }
        .test-result.skipped { border-left-color: #ffc107; }
        .error { color: #dc3545; font-family: monospace; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>Qiankun微前端测试报告</h1>
    
    <div class="summary">
        <h2>测试概要</h2>
        <div class="metric">
            <div class="metric-value">${summary.total}</div>
            <div class="metric-label">总测试数</div>
        </div>
        <div class="metric">
            <div class="metric-value passed">${summary.passed}</div>
            <div class="metric-label">通过</div>
        </div>
        <div class="metric">
            <div class="metric-value failed">${summary.failed}</div>
            <div class="metric-label">失败</div>
        </div>
        <div class="metric">
            <div class="metric-value skipped">${summary.skipped}</div>
            <div class="metric-label">跳过</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(summary.duration / 1000).toFixed(2)}s</div>
            <div class="metric-label">执行时间</div>
        </div>
        
        <h3>代码覆盖率</h3>
        <div class="metric">
            <div class="metric-value">${summary.coverage.lines}%</div>
            <div class="metric-label">行覆盖率</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.coverage.functions}%</div>
            <div class="metric-label">函数覆盖率</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.coverage.branches}%</div>
            <div class="metric-label">分支覆盖率</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.coverage.statements}%</div>
            <div class="metric-label">语句覆盖率</div>
        </div>
    </div>
    
    <div class="test-results">
        <h2>测试结果详情</h2>
        ${this.results.map(result => `
            <div class="test-result ${result.status}">
                <strong>${result.suite}</strong> - ${result.test}
                <span style="float: right;">${result.duration}ms</span>
                ${result.error ? `<div class="error">${result.error}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }
  
  private readCoverageReport(): any {
    try {
      const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      
      return {
        lines: coverage.total.lines.pct,
        functions: coverage.total.functions.pct,
        branches: coverage.total.branches.pct,
        statements: coverage.total.statements.pct
      };
    } catch (error) {
      return {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0
      };
    }
  }
  
  saveReport(filename: string = 'test-report.html'): void {
    const report = this.generateHTMLReport();
    const reportPath = path.join(process.cwd(), 'test-reports', filename);
    
    // 确保目录存在
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    
    fs.writeFileSync(reportPath, report);
    console.log(`测试报告已生成: ${reportPath}`);
  }
}
```

## 8. 总结

本测试验证方案提供了完整的微前端通信系统测试策略，包括：

### 8.1 测试覆盖
- **单元测试**: 核心通信组件的功能验证
- **集成测试**: 应用间通信和数据同步测试
- **端到端测试**: 完整用户流程验证
- **性能测试**: 加载性能和运行性能验证
- **兼容性测试**: 多浏览器兼容性验证

### 8.2 自动化流程
- **CI/CD集成**: 完整的自动化测试流水线
- **测试数据管理**: 自动化的测试数据生成和管理
- **报告生成**: 详细的测试报告和覆盖率分析

### 8.3 质量保证
- **高覆盖率要求**: 核心通信模块95%+覆盖率
- **性能基准**: 明确的性能指标和阈值
- **持续监控**: 实时的测试结果监控和告警

通过本测试方案的实施，可以确保微前端通信系统的质量和稳定性，为生产环境部署提供可靠保障。