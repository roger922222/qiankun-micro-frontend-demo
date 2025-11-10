import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'antd/dist/reset.css';
import './styles/index.css';

let root: ReactDOM.Root | null = null;

// 微前端生命周期函数
export async function bootstrap() {
  console.log('[react-user-management] react app bootstraped');
}

export async function mount(props: any) {
  console.log('[react-user-management] props from main framework', props);
  
  const { container } = props;
  const mountElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  root = ReactDOM.createRoot(mountElement!);
  root.render(
    <React.StrictMode>
      <BrowserRouter basename={window.__POWERED_BY_QIANKUN__ ? '/react-user-management' : '/'}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

export async function unmount(props: any) {
  console.log('[react-user-management] unmount');
  const { container } = props;
  const mountElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  if (root) {
    root.unmount();
    root = null;
  }
}

// 如果不是作为微前端运行，则直接渲染
if (!window.__POWERED_BY_QIANKUN__) {
  mount({});
}