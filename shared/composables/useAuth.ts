import { ref, onMounted, onUnmounted, computed, Ref } from 'vue';
import { AuthBridge } from '../communication/auth-bridge';

export interface UseAuthReturn {
  token: Ref<string | null>;
  loading: Ref<boolean>;
  isAuthenticated: Ref<boolean>;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
}

/**
 * Vue认证Composable - 用于管理微前端应用中的认证状态
 * 支持跨应用登录态同步和自动状态管理
 * 
 * @param appId - 应用标识，用于区分不同的子应用
 * @returns 认证状态和操作方法
 * 
 * @example
 * ```vue
 * <template>
 *   <div>
 *     <div v-if="!isAuthenticated">
 *       <LoginForm @login="login" />
 *     </div>
 *     <div v-else>
 *       <Dashboard @logout="logout" />
 *     </div>
 *   </div>
 * </template>
 * 
 * <script setup lang="ts">
 * import { useAuth } from '@shared/composables';
 * 
 * const { token, isAuthenticated, login, logout } = useAuth('vue-app-1');
 * </script>
 * ```
 */
export function useAuth(appId: string): UseAuthReturn {
  const token = ref<string | null>(null);
  const loading = ref(true);
  const authBridge = AuthBridge.getInstance();

  onMounted(() => {
    authBridge.initialize();
    
    // 订阅Token变化
    authBridge.subscribe(appId, (newToken) => {
      token.value = newToken;
      loading.value = false;
    });
  });

  onUnmounted(() => {
    authBridge.unsubscribe(appId);
  });

  const login = (token: string, refreshToken: string) => {
    window.dispatchEvent(new CustomEvent('auth:login', {
      detail: { token, refreshToken }
    }));
  };

  const logout = () => {
    window.dispatchEvent(new CustomEvent('auth:logout'));
  };

  return {
    token,
    loading,
    isAuthenticated: computed(() => !!token.value),
    login,
    logout
  };
}