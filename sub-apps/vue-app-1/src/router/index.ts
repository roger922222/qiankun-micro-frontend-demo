/**
 * Vue消息中心路由配置
 */

import { RouteRecordRaw } from 'vue-router';
import CommunicationDemo from '../components/CommunicationDemo.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/MessageCenter.vue'),
    meta: {
      title: '消息中心'
    }
  },
  {
    path: '/messages',
    name: 'Messages',
    component: () => import('../views/MessageCenter.vue'),
    meta: {
      title: '消息列表'
    }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('../views/Notifications.vue'),
    meta: {
      title: '通知中心'
    }
  },
  {
    path: '/communication-demo',
    name: 'CommunicationDemo',
    component: CommunicationDemo,
    meta: {
      title: '通信演示'
    }
  }
];

export default routes;