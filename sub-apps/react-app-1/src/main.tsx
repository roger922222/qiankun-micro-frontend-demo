import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import 'antd/dist/reset.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={window.__POWERED_BY_QIANKUN__ ? '/react-user-management' : '/'}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)