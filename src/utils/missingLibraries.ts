/**
 * Missing Libraries Utilities
 * Provides utilities for libraries that might not be available or need polyfills
 */

/**
 * Date formatting utility
 * Replacement for date-fns or similar libraries
 */
export const format = (date: Date | string | number, formatString: string = 'yyyy-MM-dd'): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');

  // Simple format string replacement
  return formatString
    .replace(/yyyy/g, String(year))
    .replace(/MM/g, month)
    .replace(/dd/g, day)
    .replace(/HH/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds);
};

/**
 * Parse ISO date string
 */
export const parseISO = (isoString: string): Date => {
  return new Date(isoString);
};

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Subtract days from a date
 */
export const subDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

/**
 * Get start of day
 */
export const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get end of day
 */
export const endOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
};

/**
 * Format currency for South African Rand
 */
export const formatCurrency = (amount: number, currency: string = 'ZAR'): string => {
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    // Fallback if Intl is not supported
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

/**
 * Format large numbers (e.g., 1000 -> 1K)
 */
export const formatCompactNumber = (num: number): string => {
  if (num < 1000) {
    return num.toString();
  }

  if (num < 1000000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }

  if (num < 1000000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }

  return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
};

/**
 * Generate random ID
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to title case
 */
export const toTitleCase = (str: string): string => {
  return str.split(' ').map(word => capitalize(word)).join(' ');
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Sleep/delay function
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Check if file is image
 */
export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  return imageExtensions.includes(getFileExtension(filename));
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Define helper types first to avoid parsing issues
type DebounceFunction = (...args: any[]) => void;
type ThrottleFunction = (...args: any[]) => void;
type RetryFunction<T> = () => Promise<T>;

/**
 * Debounce function
 */
export const debounce = (func: DebounceFunction, wait: number): DebounceFunction => {
  let timeout: NodeJS.Timeout;
  
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func: ThrottleFunction, limit: number): ThrottleFunction => {
  let inThrottle: boolean;
  
  return (...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Deep clone object
 */
export const deepClone = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (typeof obj === 'object') {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
};

/**
 * Retry function with exponential backoff
 */
export const retry = async (fn: RetryFunction<any>, retries: number = 3, delay: number = 1000): Promise<any> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
};

/**
 * Safe JSON parse
 */
export const safeJsonParse = (jsonString: string, fallback: any): any => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};

/**
 * Logan Freights specific utilities
 */
export const loganFreightsUtils = {
  /**
   * Format South African phone number
   */
  formatPhoneNumber: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('27')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    if (cleaned.startsWith('0')) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
  },

  /**
   * Validate South African ID number
   */
  validateSAIdNumber: (idNumber: string): boolean => {
    if (!/^\d{13}$/.test(idNumber)) return false;
    
    // Basic Luhn algorithm check
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      let digit = parseInt(idNumber[i]);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(idNumber[12]);
  },

  /**
   * Format business registration number
   */
  formatBusinessNumber: (regNumber: string): string => {
    const cleaned = regNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 4)}/${cleaned.slice(4, 10)}/${cleaned.slice(10)}`;
    }
    return regNumber;
  },

  /**
   * Get South African provinces
   */
  getSAProvinces: (): string[] => [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West',
    'Western Cape'
  ],

  /**
   * Format address for Logan Freights
   */
  formatAddress: (address: {
    street?: string;
    suburb?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  }): string => {
    const parts = [
      address.street,
      address.suburb,
      address.city,
      address.province,
      address.postalCode
    ].filter(Boolean);
    
    return parts.join(', ');
  }
};

// Export all utilities as default
export default {
  format,
  parseISO,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isToday,
  formatDistanceToNow,
  formatCurrency,
  formatCompactNumber,
  debounce,
  throttle,
  generateId,
  deepClone,
  capitalize,
  toTitleCase,
  truncate,
  isEmpty,
  sleep,
  retry,
  safeJsonParse,
  getFileExtension,
  isImageFile,
  formatFileSize,
  loganFreightsUtils
};