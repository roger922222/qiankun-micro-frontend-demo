import { USER_STATUS_LABELS, USER_STATUS_COLORS } from '@/constants';

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN');
};

export const formatUserStatus = (status: string): { text: string; color: string } => {
  return {
    text: USER_STATUS_LABELS[status as keyof typeof USER_STATUS_LABELS] || status,
    color: USER_STATUS_COLORS[status as keyof typeof USER_STATUS_COLORS] || 'default',
  };
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  }) as T;
};

export const downloadFile = (buffer: ArrayBuffer, filename: string, mimeType: string) => {
  const blob = new Blob([buffer], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};