// إعدادات النظام المركزية
const SYSTEM_CONFIG = {
  // معلومات المتجر
  STORE_NAME: 'Smart Kids Kuwait',
  STORE_DESCRIPTION: 'أفضل الكتب التعليمية والتفاعلية للأطفال',
  CURRENCY: 'KWD',
  CURRENCY_SYMBOL: 'د.ك',
  
  // الروابط المهمة
  URLS: {
    HOME: '/',
    CART: '/cart',
    CHECKOUT: '/checkout', 
    ADMIN: '/admin',
    ADMIN_ENHANCED: '/admin-enhanced',
    TRACK: '/track',
    COLLECTIONS: '/collections',
    SEARCH: '/search'
  },
  
  // إعدادات الطلبات
  ORDER_CONFIG: {
    PREFIX: 'ORD-',
    STATUSES: {
      PENDING: 'pending',
      PROCESSING: 'processing', 
      SHIPPED: 'shipped',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled'
    },
    STATUS_LABELS: {
      pending: 'في الانتظار',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن', 
      completed: 'مكتمل',
      cancelled: 'ملغي'
    },
    STATUS_COLORS: {
      pending: '#f59e0b',
      processing: '#3b82f6',
      shipped: '#8b5cf6',
      completed: '#10b981',
      cancelled: '#ef4444'
    }
  },
  
  // إعدادات الشحن
  SHIPPING_CONFIG: {
    FREE_SHIPPING_THRESHOLD: 20, // د.ك
    DEFAULT_SHIPPING_COST: 2, // د.ك
    SHIPPING_MESSAGE: 'التوصيل مجاناً للطلبات بقيمة 20 د.ك أو أكثر'
  },
  
  // معلومات الاتصال
  CONTACT_INFO: {
    PHONE: '+965-XXXXXXXX',
    EMAIL: 'info@smartkids.com.kw',
    ADDRESS: 'الكويت',
    SOCIAL_MEDIA: {
      INSTAGRAM: '@smartkids_kuwait',
      WHATSAPP: '+965-XXXXXXXX'
    }
  },
  
  // إعدادات قاعدة البيانات
  DATABASE_CONFIG: {
    NAME: 'orders.db',
    BACKUP_PREFIX: 'orders_backup_',
    TABLES: {
      ORDERS: 'orders',
      ORDER_ITEMS: 'order_items'
    }
  },
  
  // إعدادات الواجهة
  UI_CONFIG: {
    THEME: {
      PRIMARY_COLOR: '#667eea',
      SECONDARY_COLOR: '#764ba2', 
      SUCCESS_COLOR: '#10b981',
      ERROR_COLOR: '#ef4444',
      WARNING_COLOR: '#f59e0b'
    },
    RTL: true,
    LANGUAGE: 'ar'
  }
};

// دوال مساعدة
const HELPERS = {
  // تنسيق العملة
  formatCurrency: (amount) => {
    return `${parseFloat(amount).toFixed(3)} ${SYSTEM_CONFIG.CURRENCY_SYMBOL}`;
  },
  
  // تنسيق التاريخ
  formatDate: (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  },
  
  // تنسيق التاريخ والوقت
  formatDateTime: (dateString) => {
    return new Date(dateString).toLocaleString('ar-EG');
  },
  
  // إنشاء رقم طلب فريد
  generateOrderNumber: () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).slice(-4).toUpperCase();
    return `${SYSTEM_CONFIG.ORDER_CONFIG.PREFIX}${timestamp}-${random}`;
  },
  
  // الحصول على لون الحالة
  getStatusColor: (status) => {
    return SYSTEM_CONFIG.ORDER_CONFIG.STATUS_COLORS[status] || '#6b7280';
  },
  
  // الحصول على نص الحالة
  getStatusLabel: (status) => {
    return SYSTEM_CONFIG.ORDER_CONFIG.STATUS_LABELS[status] || status;
  },
  
  // حساب تكلفة الشحن
  calculateShipping: (orderTotal) => {
    return orderTotal >= SYSTEM_CONFIG.SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD 
      ? 0 
      : SYSTEM_CONFIG.SHIPPING_CONFIG.DEFAULT_SHIPPING_COST;
  },
  
  // التحقق من صحة البريد الإلكتروني
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  // التحقق من صحة رقم الهاتف الكويتي
  validateKuwaitiPhone: (phone) => {
    const re = /^(\+965|965|00965)?[2569]\d{7}$/;
    return re.test(phone.replace(/\s/g, ''));
  }
};

// تصدير الإعدادات
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SYSTEM_CONFIG, HELPERS };
}

if (typeof window !== 'undefined') {
  window.SYSTEM_CONFIG = SYSTEM_CONFIG;
  window.HELPERS = HELPERS;
}