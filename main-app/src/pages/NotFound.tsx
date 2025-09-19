/**
 * 404页面组件
 * 当路由不匹配时显示的页面
 */

import React from 'react';
import { Result, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

/**
 * 404页面组件
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <>
      <Helmet>
        <title>页面未找到 - Qiankun微前端示例</title>
      </Helmet>

      <div style={{ 
        padding: '50px 20px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <Result
          status="404"
          title="404"
          subTitle="抱歉，您访问的页面不存在。"
          extra={[
            <Button type="primary" key="home" icon={<HomeOutlined />} onClick={handleGoHome}>
              返回首页
            </Button>,
            <Button key="back" onClick={handleGoBack}>
              返回上页
            </Button>
          ]}
        />
      </div>
    </>
  );
};

export default NotFound;