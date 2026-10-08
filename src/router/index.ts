import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import LabPage from '@/pages/LabPage.vue'
import InfoPage from '@/pages/InfoPage.vue'

// 定义路由配置
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/lab',
    name: 'lab',
    component: LabPage,
  },
  {
    path: '/info',
    name: 'info',
    component: InfoPage,
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
