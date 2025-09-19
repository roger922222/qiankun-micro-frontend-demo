/**
 * 加密工具
 * 提供常用的加密和编码功能
 */

/**
 * Base64编码
 */
export function base64Encode(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (error) {
    console.error('Base64 encode error:', error);
    return '';
  }
}

/**
 * Base64解码
 */
export function base64Decode(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (error) {
    console.error('Base64 decode error:', error);
    return '';
  }
}

/**
 * URL安全的Base64编码
 */
export function base64UrlEncode(str: string): string {
  return base64Encode(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * URL安全的Base64解码
 */
export function base64UrlDecode(str: string): string {
  // 补充padding
  let padded = str;
  const padding = 4 - (str.length % 4);
  if (padding !== 4) {
    padded += '='.repeat(padding);
  }
  
  return base64Decode(
    padded.replace(/-/g, '+').replace(/_/g, '/')
  );
}

/**
 * 简单的字符串哈希
 */
export function simpleHash(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash);
}

/**
 * 生成随机盐值
 */
export function generateSalt(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 简单的XOR加密/解密
 */
export function xorCipher(text: string, key: string): string {
  let result = '';
  
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    result += String.fromCharCode(textChar ^ keyChar);
  }
  
  return result;
}

/**
 * 凯撒密码加密
 */
export function caesarEncrypt(text: string, shift: number = 3): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const start = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - start + shift) % 26) + start);
  });
}

/**
 * 凯撒密码解密
 */
export function caesarDecrypt(text: string, shift: number = 3): string {
  return caesarEncrypt(text, 26 - shift);
}

/**
 * 生成MD5哈希（简化版本，仅用于非安全场景）
 */
export function simpleMD5(str: string): string {
  // 这是一个简化的MD5实现，不应用于安全场景
  // 在生产环境中应使用crypto-js或其他专业库
  
  function rotateLeft(value: number, amount: number): number {
    return (value << amount) | (value >>> (32 - amount));
  }
  
  function addUnsigned(x: number, y: number): number {
    return ((x & 0x7FFFFFFF) + (y & 0x7FFFFFFF)) ^ (x & 0x80000000) ^ (y & 0x80000000);
  }
  
  function f(x: number, y: number, z: number): number {
    return (x & y) | ((~x) & z);
  }
  
  function g(x: number, y: number, z: number): number {
    return (x & z) | (y & (~z));
  }
  
  function h(x: number, y: number, z: number): number {
    return x ^ y ^ z;
  }
  
  function i(x: number, y: number, z: number): number {
    return y ^ (x | (~z));
  }
  
  // 简化的MD5实现
  let hash = simpleHash(str);
  return hash.toString(16).padStart(8, '0');
}

/**
 * JWT工具类
 */
export class JWTHelper {
  /**
   * 解析JWT token（不验证签名）
   */
  static decode(token: string): { header: any; payload: any; signature: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      const signature = parts[2];
      
      return { header, payload, signature };
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }
  
  /**
   * 检查JWT是否过期
   */
  static isExpired(token: string): boolean {
    const decoded = this.decode(token);
    if (!decoded || !decoded.payload.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.payload.exp < currentTime;
  }
  
  /**
   * 获取JWT剩余有效时间（秒）
   */
  static getTimeToExpiry(token: string): number {
    const decoded = this.decode(token);
    if (!decoded || !decoded.payload.exp) {
      return 0;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, decoded.payload.exp - currentTime);
  }
  
  /**
   * 创建简单的JWT token（仅用于演示，不包含签名验证）
   */
  static create(payload: any, expiresIn: number = 3600): string {
    const header = {
      alg: 'none',
      typ: 'JWT'
    };
    
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn
    };
    
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
    
    return `${encodedHeader}.${encodedPayload}.`;
  }
}

/**
 * 密码强度检查
 */
export function checkPasswordStrength(password: string): {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];
  
  // 长度检查
  if (password.length >= 8) {
    score += 1;
  } else {
    suggestions.push('密码长度至少8位');
  }
  
  if (password.length >= 12) {
    score += 1;
  }
  
  // 包含小写字母
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含小写字母');
  }
  
  // 包含大写字母
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含大写字母');
  }
  
  // 包含数字
  if (/\d/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含数字');
  }
  
  // 包含特殊字符
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含特殊字符');
  }
  
  // 不包含常见模式
  if (!/(.)\1{2,}/.test(password) && !/123|abc|qwe/i.test(password)) {
    score += 1;
  } else {
    suggestions.push('避免重复字符或常见模式');
  }
  
  let level: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 2) {
    level = 'weak';
  } else if (score <= 4) {
    level = 'fair';
  } else if (score <= 6) {
    level = 'good';
  } else {
    level = 'strong';
  }
  
  return { score, level, suggestions };
}

/**
 * 生成安全的随机密码
 */
export function generatePassword(options: {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeSimilar?: boolean;
} = {}): string {
  const {
    length = 12,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true
  } = options;
  
  let chars = '';
  
  if (includeLowercase) {
    chars += excludeSimilar ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeUppercase) {
    chars += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeNumbers) {
    chars += excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (includeSymbols) {
    chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }
  
  if (!chars) {
    throw new Error('At least one character type must be included');
  }
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}

/**
 * 数据脱敏
 */
export const mask = {
  /**
   * 手机号脱敏
   */
  phone(phone: string): string {
    if (!phone || phone.length !== 11) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  },
  
  /**
   * 邮箱脱敏
   */
  email(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [username, domain] = email.split('@');
    if (username.length <= 2) return email;
    return `${username.charAt(0)}***${username.slice(-1)}@${domain}`;
  },
  
  /**
   * 身份证脱敏
   */
  idCard(idCard: string): string {
    if (!idCard || idCard.length < 8) return idCard;
    return idCard.replace(/(\d{4})\d+(\d{4})/, '$1**********$2');
  },
  
  /**
   * 银行卡脱敏
   */
  bankCard(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 8) return cardNumber;
    return cardNumber.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2');
  },
  
  /**
   * 姓名脱敏
   */
  name(name: string): string {
    if (!name || name.length <= 1) return name;
    if (name.length === 2) return `${name.charAt(0)}*`;
    return `${name.charAt(0)}${'*'.repeat(name.length - 2)}${name.slice(-1)}`;
  },
  
  /**
   * 地址脱敏
   */
  address(address: string): string {
    if (!address || address.length <= 6) return address;
    return `${address.substring(0, 6)}****${address.slice(-2)}`;
  }
};

/**
 * 数字签名验证（简化版）
 */
export class SimpleSignature {
  private secret: string;
  
  constructor(secret: string) {
    this.secret = secret;
  }
  
  /**
   * 生成签名
   */
  sign(data: string): string {
    const timestamp = Date.now().toString();
    const payload = `${data}.${timestamp}`;
    const hash = simpleHash(payload + this.secret);
    return `${timestamp}.${hash.toString(16)}`;
  }
  
  /**
   * 验证签名
   */
  verify(data: string, signature: string, maxAge: number = 300000): boolean {
    try {
      const [timestamp, hash] = signature.split('.');
      const signTime = parseInt(timestamp, 10);
      
      // 检查时间戳
      if (Date.now() - signTime > maxAge) {
        return false;
      }
      
      // 验证签名
      const payload = `${data}.${timestamp}`;
      const expectedHash = simpleHash(payload + this.secret);
      
      return hash === expectedHash.toString(16);
    } catch {
      return false;
    }
  }
}

/**
 * 安全的随机数生成器
 */
export function secureRandom(min: number = 0, max: number = 1): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return min + (array[0] / (0xFFFFFFFF + 1)) * (max - min);
  } else {
    // 降级到Math.random()
    return min + Math.random() * (max - min);
  }
}

/**
 * 生成加密安全的随机字符串
 */
export function secureRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(secureRandom(0, chars.length));
    result += chars[randomIndex];
  }
  
  return result;
}