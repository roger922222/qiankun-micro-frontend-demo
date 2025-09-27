# React App 5 API 文档

## 概述

本文档描述了 React App 5 (设置中心) 的所有 API 接口，包括状态管理、组件接口、事件系统等。

## 状态管理 API

### settingsStore

全局设置状态管理对象，基于 Valtio 实现。

#### 状态结构

```typescript
interface SettingsState {
  user: UserInfo;                    // 用户信息
  preferences: UserPreferences;      // 用户偏好设置
  system: SystemConfig;              // 系统配置
  theme: 'light' | 'dark';          // 当前主题
  language: string;                  // 当前语言
  loading: boolean;                  // 全局加载状态
  error: string | null;              // 错误信息
  reset: () => void;                 // 重置方法
}
```

#### 类型定义

##### UserInfo
```typescript
interface UserInfo {
  id: string;                        // 用户ID
  name: string;                      // 用户姓名
  email: string;                     // 邮箱地址
  avatar?: string;                   // 头像URL
  phone?: string;                    // 手机号码
  department?: string;               // 所属部门
  position?: string;                 // 职位信息
}
```

##### UserPreferences
```typescript
interface UserPreferences {
  theme: 'light' | 'dark';          // 主题偏好
  language: string;                  // 语言偏好 (zh-CN, en-US等)
  timezone: string;                  // 时区设置
  dateFormat: string;                // 日期格式
  timeFormat: '12h' | '24h';        // 时间格式
  notifications: {                   // 通知设置
    email: boolean;                  // 邮件通知
    push: boolean;                   // 推送通知
    sms: boolean;                    // 短信通知
  };
}
```

##### SystemConfig
```typescript
interface SystemConfig {
  siteName: string;                  // 站点名称
  version: string;                   // 系统版本
  apiUrl: string;                    // API服务地址
  cdnUrl: string;                    // CDN服务地址
  features: {                        // 功能开关
    darkMode: boolean;               // 深色模式支持
    multiLanguage: boolean;          // 多语言支持
    notifications: boolean;          // 通知系统
  };
}
```

#### 使用示例

```typescript
import { useSnapshot } from 'valtio';
import { settingsStore } from './store/settingsStore';

const Component: React.FC = () => {
  const settings = useSnapshot(settingsStore);
  
  return (
    <div>
      <h1>欢迎, {settings.user.name}</h1>
      <p>当前主题: {settings.theme}</p>
      <p>当前语言: {settings.language}</p>
    </div>
  );
};
```

### settingsActions

状态操作方法集合，提供对设置状态的各种操作。

#### 方法列表

##### updateUser
更新用户信息。

```typescript
updateUser: (userInfo: Partial<UserInfo>) => void
```

**参数**:
- `userInfo`: 部分用户信息对象

**示例**:
```typescript
settingsActions.updateUser({
  name: '张三',
  email: 'zhangsan@example.com'
});
```

##### updatePreferences
更新用户偏好设置。

```typescript
updatePreferences: (preferences: Partial<UserPreferences>) => void
```

**参数**:
- `preferences`: 部分偏好设置对象

**示例**:
```typescript
settingsActions.updatePreferences({
  theme: 'dark',
  language: 'en-US'
});
```

##### updateSystem
更新系统配置。

```typescript
updateSystem: (systemConfig: Partial<SystemConfig>) => void
```

**参数**:
- `systemConfig`: 部分系统配置对象

**示例**:
```typescript
settingsActions.updateSystem({
  siteName: '新站点名称',
  version: '2.0.0'
});
```

##### setTheme
设置应用主题。

```typescript
setTheme: (theme: 'light' | 'dark') => void
```

**参数**:
- `theme`: 主题类型

**示例**:
```typescript
settingsActions.setTheme('dark');
```

##### setLanguage
设置应用语言。

```typescript
setLanguage: (language: string) => void
```

**参数**:
- `language`: 语言代码

**示例**:
```typescript
settingsActions.setLanguage('en-US');
```

##### setLoading
设置全局加载状态。

```typescript
setLoading: (loading: boolean) => void
```

**参数**:
- `loading`: 加载状态

**示例**:
```typescript
settingsActions.setLoading(true);
```

##### setError
设置错误信息。

```typescript
setError: (error: string | null) => void
```

**参数**:
- `error`: 错误信息，null表示清除错误

**示例**:
```typescript
settingsActions.setError('网络连接失败');
settingsActions.setError(null); // 清除错误
```

##### reset
重置所有设置到默认值。

```typescript
reset: () => void
```

**示例**:
```typescript
settingsActions.reset();
```

##### saveToStorage
保存设置到本地存储。

```typescript
saveToStorage: () => void
```

**示例**:
```typescript
settingsActions.saveToStorage();
```

##### loadFromStorage
从本地存储加载设置。

```typescript
loadFromStorage: () => void
```

**示例**:
```typescript
settingsActions.loadFromStorage();
```

## 组件 API

### 页面组件

#### GeneralSettings
通用设置页面组件。

**功能**:
- 主题设置 (浅色/深色)
- 语言设置 (多语言支持)
- 时区设置
- 日期时间格式设置
- 通知偏好设置

**Props**: 无

**使用示例**:
```typescript
import GeneralSettings from './pages/GeneralSettings';

<Route path="/general" element={<GeneralSettings />} />
```

#### UserProfile
用户配置页面组件。

**功能**:
- 用户基本信息编辑
- 头像上传
- 联系方式管理
- 账户信息查看

**Props**: 无

**使用示例**:
```typescript
import UserProfile from './pages/UserProfile';

<Route path="/profile" element={<UserProfile />} />
```

#### SystemConfig
系统配置页面组件。

**功能**:
- 系统基础配置
- 服务地址配置
- 功能开关管理
- 系统状态监控

**Props**: 无

**使用示例**:
```typescript
import SystemConfig from './pages/SystemConfig';

<Route path="/system" element={<SystemConfig />} />
```

### 布局组件

#### AppHeader
应用头部组件。

**功能**:
- 显示应用Logo和标题
- 用户信息显示
- 主题切换开关
- 语言切换按钮
- 用户操作菜单

**Props**: 无

**使用示例**:
```typescript
import AppHeader from './components/Layout/AppHeader';

<Layout>
  <AppHeader />
  {/* 其他内容 */}
</Layout>
```

#### AppSidebar
侧边栏导航组件。

**功能**:
- 主导航菜单
- 路由跳转
- 菜单状态管理

**Props**: 无

**使用示例**:
```typescript
import AppSidebar from './components/Layout/AppSidebar';

<Layout>
  <AppSidebar />
  {/* 其他内容 */}
</Layout>
```

#### AppFooter
应用底部组件。

**功能**:
- 版权信息显示
- 系统版本信息
- 相关链接

**Props**: 无

**使用示例**:
```typescript
import AppFooter from './components/Layout/AppFooter';

<Layout>
  {/* 其他内容 */}
  <AppFooter />
</Layout>
```

### 工具组件

#### ErrorFallback
错误边界回退组件。

**功能**:
- 显示友好的错误页面
- 错误信息展示 (开发模式)
- 错误恢复操作
- 页面重载功能

**Props**:
```typescript
interface ErrorFallbackProps {
  error: Error;                      // 错误对象
  resetErrorBoundary: () => void;    // 重置错误边界的函数
}
```

**使用示例**:
```typescript
import { ErrorBoundary } from 'react-error-boundary';
import ErrorFallback from './components/ErrorFallback';

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

## 事件系统 API

### 全局事件

应用使用全局事件总线进行组件间通信。

#### 事件类型

```typescript
const EVENT_TYPES = {
  THEME_CHANGE: 'THEME_CHANGE',        // 主题变更事件
  LANGUAGE_CHANGE: 'LANGUAGE_CHANGE',  // 语言变更事件
  USER_LOGOUT: 'USER_LOGOUT',          // 用户登出事件
  APP_READY: 'APP_READY',              // 应用就绪事件
};
```

#### 事件结构

```typescript
interface GlobalEvent {
  type: string;                        // 事件类型
  source: string;                      // 事件源
  timestamp: string;                   // 时间戳
  id: string;                         // 事件ID
  data: any;                          // 事件数据
}
```

#### 事件示例

##### 主题变更事件
```typescript
{
  type: 'THEME_CHANGE',
  source: 'react-settings',
  timestamp: '2025-09-26T10:30:00.000Z',
  id: 'theme-change-1727341800000',
  data: { theme: 'dark' }
}
```

##### 语言变更事件
```typescript
{
  type: 'LANGUAGE_CHANGE',
  source: 'react-settings',
  timestamp: '2025-09-26T10:30:00.000Z',
  id: 'language-change-1727341800000',
  data: { language: 'en-US' }
}
```

##### 用户登出事件
```typescript
{
  type: 'USER_LOGOUT',
  source: 'react-settings',
  timestamp: '2025-09-26T10:30:00.000Z',
  id: 'user-logout-1727341800000',
  data: { reason: 'manual' }
}
```

## qiankun 集成 API

### 生命周期函数

应用导出标准的 qiankun 生命周期函数。

#### bootstrap
应用启动时调用。

```typescript
export async function bootstrap(): Promise<void>
```

#### mount
应用挂载时调用。

```typescript
export async function mount(props: {
  container: HTMLElement;              // 挂载容器
  routerBase?: string;                 // 路由基础路径
}): Promise<void>
```

#### unmount
应用卸载时调用。

```typescript
export async function unmount(): Promise<void>
```

### 微应用配置

```typescript
// vite.config.ts 中的配置
legacyQiankun({
  name: 'react-settings',             // 微应用名称
  devSandbox: true,                   // 开发环境沙箱
})
```

## 工具函数 API

### 日志系统

```typescript
interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

const globalLogger: Logger;
```

**使用示例**:
```typescript
globalLogger.info('User settings updated', { userId: '123' });
globalLogger.error('Failed to save settings', error);
```

### 事件总线

```typescript
interface EventBus {
  on: (type: string, handler: (event: any) => void) => void;
  off: (type: string, handler: (event: any) => void) => void;
  emit: (event: GlobalEvent) => void;
}

const globalEventBus: EventBus;
```

**使用示例**:
```typescript
// 监听事件
const handleThemeChange = (event: any) => {
  console.log('Theme changed:', event.data.theme);
};

globalEventBus.on('THEME_CHANGE', handleThemeChange);

// 发送事件
globalEventBus.emit({
  type: 'THEME_CHANGE',
  source: 'react-settings',
  timestamp: new Date().toISOString(),
  id: `theme-change-${Date.now()}`,
  data: { theme: 'dark' }
});

// 移除监听
globalEventBus.off('THEME_CHANGE', handleThemeChange);
```

## 样式 API

### CSS 类名规范

#### 布局相关
```css
.settings-app-layout          /* 主布局容器 */
.settings-app-header          /* 头部区域 */
.settings-app-sidebar         /* 侧边栏区域 */
.settings-app-content         /* 内容区域 */
.settings-app-footer          /* 底部区域 */
```

#### 页面相关
```css
.settings-page                /* 页面容器 */
.settings-page-header         /* 页面头部 */
.settings-page-content        /* 页面内容 */
```

#### 表单相关
```css
.settings-form                /* 设置表单 */
.settings-card                /* 设置卡片 */
.settings-switch-item         /* 开关设置项 */
```

### 主题变量

#### 浅色主题
```css
:root {
  --primary-color: #fa8c16;
  --background-color: #f5f5f5;
  --text-color: #333;
  --border-color: #e8e8e8;
}
```

#### 深色主题
```css
[data-theme='dark'] {
  --primary-color: #fa8c16;
  --background-color: #141414;
  --text-color: #fff;
  --border-color: #303030;
}
```

## 错误处理 API

### 错误类型

```typescript
interface AppError {
  code: string;                       // 错误代码
  message: string;                    // 错误信息
  details?: any;                      // 错误详情
  timestamp: string;                  // 发生时间
}
```

### 错误处理函数

```typescript
const handleError = (error: Error, context?: any) => {
  globalLogger.error('Application error', error, context);
  settingsActions.setError(error.message);
};
```

## 性能监控 API

### 性能指标

```typescript
interface PerformanceMetrics {
  loadTime: number;                   // 加载时间
  renderTime: number;                 // 渲染时间
  memoryUsage: number;                // 内存使用
  bundleSize: number;                 // 包大小
}
```

## 版本信息

- **API 版本**: 1.0.0
- **最后更新**: 2025-09-26
- **兼容性**: React 18+, TypeScript 4.9+, qiankun 2.x

---

**文档版本**: 1.0  
**维护人员**: 开发团队  
**联系方式**: 开发团队邮箱