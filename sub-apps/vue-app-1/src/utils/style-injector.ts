/**
 * 样式注入工具
 * 专门处理微前端环境下的样式注入问题
 */

export class StyleInjector {
  private static instance: StyleInjector;
  private injectedStyles: Set<string> = new Set();

  static getInstance(): StyleInjector {
    if (!StyleInjector.instance) {
      StyleInjector.instance = new StyleInjector();
    }
    return StyleInjector.instance;
  }

  /**
   * 安全地注入样式
   * @param styleId 样式ID，用于避免重复注入
   * @param cssText CSS样式文本
   */
  injectStyle(styleId: string, cssText: string): void {
    // 避免重复注入
    if (this.injectedStyles.has(styleId)) {
      return;
    }

    try {
      // 检查是否已存在同ID的样式
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        this.injectedStyles.add(styleId);
        return;
      }

      // 创建样式元素
      const style = document.createElement('style');
      style.id = styleId;
      style.type = 'text/css';
      
      // 使用 textContent 而不是 innerHTML
      if (style.styleSheet) {
        // IE 兼容
        (style.styleSheet as any).cssText = cssText;
      } else {
        style.textContent = cssText;
      }

      // 直接插入到 document.head，不使用任何可能被劫持的方法
      const head = document.getElementsByTagName('head')[0];
      if (head) {
        // 使用 insertBefore 而不是 appendChild，避免被 qiankun 劫持
        const firstChild = head.firstChild;
        if (firstChild) {
          head.insertBefore(style, firstChild);
        } else {
          // 如果 head 为空，直接添加
          head.appendChild(style);
        }
        
        this.injectedStyles.add(styleId);
        console.log(`样式 ${styleId} 注入成功`);
      } else {
        console.warn('无法找到 head 元素');
      }
    } catch (error) {
      console.warn(`样式 ${styleId} 注入失败:`, error);
      
      // 降级方案：尝试通过其他方式注入
      this.fallbackInjectStyle(styleId, cssText);
    }
  }

  /**
   * 降级样式注入方案
   */
  private fallbackInjectStyle(styleId: string, cssText: string): void {
    try {
      // 尝试通过修改现有样式表的方式注入
      const styleSheets = document.styleSheets;
      if (styleSheets.length > 0) {
        const sheet = styleSheets[0] as CSSStyleSheet;
        if (sheet.insertRule) {
          // 将 CSS 文本拆分为规则并逐个插入
          const rules = cssText.split('}').filter(rule => rule.trim());
          rules.forEach(rule => {
            if (rule.trim()) {
              try {
                sheet.insertRule(rule + '}', sheet.cssRules.length);
              } catch (ruleError) {
                console.warn('插入CSS规则失败:', rule, ruleError);
              }
            }
          });
          this.injectedStyles.add(styleId);
          console.log(`样式 ${styleId} 通过降级方案注入成功`);
        }
      }
    } catch (fallbackError) {
      console.warn('降级样式注入也失败了:', fallbackError);
    }
  }

  /**
   * 移除已注入的样式
   * @param styleId 样式ID
   */
  removeStyle(styleId: string): void {
    try {
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
        this.injectedStyles.delete(styleId);
        console.log(`样式 ${styleId} 移除成功`);
      }
    } catch (error) {
      console.warn(`样式 ${styleId} 移除失败:`, error);
    }
  }

  /**
   * 清理所有注入的样式
   */
  cleanup(): void {
    this.injectedStyles.forEach(styleId => {
      this.removeStyle(styleId);
    });
  }
}

// 导出单例实例
export const styleInjector = StyleInjector.getInstance();

// MessageCenter 专用样式
export const MESSAGE_CENTER_STYLES = `
.vue-message-center {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif !important;
}

.vue-message-center .message-center-header {
  background: #f5f5f5 !important;
}

.vue-message-center .message-center-header h2 {
  color: #1890ff !important;
  font-size: 20px !important;
  font-weight: 600 !important;
}

.vue-message-center .message-unread {
  background-color: #e6f7ff !important;
  border-left: 4px solid #1890ff !important;
}

.vue-message-center .ant-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.vue-message-center .ant-list-item:hover {
  background-color: #f5f5f5 !important;
}

.vue-message-center .ant-card-head {
  border-bottom: 1px solid #f0f0f0 !important;
}

.vue-message-center .ant-card-body {
  padding: 16px !important;
}

.vue-message-center .ant-list-item {
  padding: 12px 16px !important;
  border-bottom: 1px solid #f0f0f0 !important;
}

.vue-message-center .ant-tag {
  margin: 0 !important;
}

.vue-message-center .ant-button {
  margin-left: 8px !important;
}

.vue-message-center .ant-divider {
  margin: 16px 0 !important;
}

.vue-message-center .ant-space {
  gap: 8px !important;
}

.vue-message-center .ant-badge {
  font-size: 12px !important;
}
`;