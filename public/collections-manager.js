// Collections Manager - إدارة المجموعات والمنتجات
// نسخة محسّنة مع دعم كامل لـ 14 مجموعة

const COLLECTIONS = {
  'montessori': {
    name: 'مونتيسوري',
    description: 'ألعاب ودوات تعليمية وفقاً لنظام مونتيسوري',
    tags: ['مونتيسوري', 'Montessori'],
    icon: '🎯'
  },
  'stories-world': {
    name: 'عالم القصص والحكايات المصورة',
    description: 'قصص مصورة جميلة وحكايات تفاعلية للأطفال',
    tags: ['عالم القصص', 'حكايات مصورة', 'قصص مصورة'],
    icon: '📚'
  },
  'bestsellers': {
    name: 'Smart Kids Kuwait الأطفال المبتكرون الكويت الأفضل مبيعاً',
    description: 'أكثر المنتجات مبيعاً والمفضلة عند العملاء',
    tags: ['الأفضل مبيعاً', 'bestseller', 'أكثر مبيعاً'],
    icon: '⭐'
  },
  'latest-releases': {
    name: 'اكتشف أحدث إصداراتنا للأطفال',
    description: 'أحدث المنتجات والإصدارات الجديدة',
    tags: ['اكتشف أحدث إصداراتنا للأطفال', 'إصدارات جديدة', 'أحدث'],
    icon: '🆕'
  },
  'audio-stories': {
    name: 'قصصي الصوتية المسموعة',
    description: 'قصص صوتية مسموعة مع صور جميلة',
    tags: ['قصصي الصوتية المسموعة', 'صوتية', 'مسموعة'],
    icon: '🎧'
  },
  'interactive-offers': {
    name: 'عروض القصص التفاعلية',
    description: 'عروض خاصة على القصص والكتب التفاعلية',
    tags: ['عروض القصص التفاعلية', 'تفاعلية', 'عروض خاصة'],
    icon: '🎁'
  },
  'single-stories': {
    name: 'القصص المفردة للأطفال',
    description: 'قصص مفردة موضوعية متنوعة',
    tags: ['القصص المفردة للأطفال', 'القصص المفردة للأطفال', 'قصص مفردة'],
    icon: '📖'
  },
  'self-reading': {
    name: 'أنا أقرأ بنفسي',
    description: 'كتب تعليم القراءة المستقلة للأطفال',
    tags: ['أنا أقرأ بنفسي', 'قراءة مستقلة'],
    icon: '👶'
  },
  'interactive-books': {
    name: 'كتبي التفاعلية الحركية',
    description: 'كتب تفاعلية مع أنشطة حركية',
    tags: ['كتبي التفاعلية الحركية', 'تفاعلية حركية'],
    icon: '🤸'
  },
  'islamic-library': {
    name: 'عروض مكتبتي الإسلامية',
    description: 'كتب وقصص إسلامية تعليمية',
    tags: ['عروض مكتبتي الإسلامية', 'إسلامية', 'مكتبة إسلامية'],
    icon: '🕌'
  },
  'smart-pen': {
    name: 'ابدأ رحلتك مع القلم الناطق',
    description: 'أقلام ناطقة وكتب صوتية تفاعلية',
    tags: ['ابدأ رحلتك مع القلم الناطق', 'قلم ناطق', 'ناطق'],
    icon: '🖊️'
  },
  'history-encyclopedia': {
    name: 'موسوعات التاريخ المصور',
    description: 'موسوعات تاريخية مصورة بجودة عالية',
    tags: ['موسوعات التاريخ المصور', 'تاريخ مصور', 'موسوعات'],
    icon: '🏛️'
  },
  'favorite-books': {
    name: 'الكُتب المُحببة للأطفال',
    description: 'الكتب الكلاسيكية والمحبوبة من الأطفال',
    tags: ['الكُتب المُحببة للأطفال', 'محببة', 'المفضلة'],
    icon: '💝'
  },
  'all-products': {
    name: 'تسوق جميع منتجاتنا الآن',
    description: 'جميع المنتجات والعروض المتاحة',
    tags: ['تسوق جميع منتجاتنا الآن', 'جميع المنتجات'],
    icon: '🛍️'
  }
};

const COLLECTION_PRIORITY = [
  'interactive-offers',
  'bestsellers',
  'latest-releases',
  'montessori',
  'smart-pen',
  'audio-stories',
  'interactive-books',
  'self-reading',
  'single-stories',
  'stories-world',
  'islamic-library',
  'history-encyclopedia',
  'favorite-books',
  'all-products'
];

// دوال مساعدة
function _norm(v) {
  return (v ?? '').toString().trim().toLowerCase();
}

function _getProductTags(product) {
  if (Array.isArray(product.tags)) return product.tags;
  if (product.tags) return String(product.tags).split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

function _matchesCollection(rawProduct, collection) {
  const productTags = _getProductTags(rawProduct).map(_norm);
  const colTags = (collection.tags || []).map(_norm);

  for (const pt of productTags) {
    for (const ct of colTags) {
      if (!pt || !ct) continue;
      if (pt.includes(ct) || ct.includes(pt)) return true;
    }
  }

  const hay = _norm(`${rawProduct.title || rawProduct.name || ''} ${rawProduct.type || rawProduct.category || ''} ${rawProduct.body_html || rawProduct.description || ''}`);
  return colTags.some(ct => ct && hay.includes(ct));
}

function getCollectionKeyForProduct(rawProduct) {
  const category = _norm(rawProduct.category || rawProduct.type || '');
  const name = _norm(rawProduct.name || rawProduct.title || '');
  const desc = _norm(rawProduct.description || rawProduct.body_html || '');
  const hay = `${category} ${name} ${desc}`;

  if (hay.includes('مونتيسوري')) return 'montessori';

  if (
    hay.includes('صوتية') ||
    hay.includes('مسموعة') ||
    hay.includes('كتب تعليمية صوتية') ||
    hay.includes('قصص أطفال صوتية') ||
    hay.includes('قصص تربوية وكتب صوتية')
  ) return 'audio-stories';

  if (
    hay.includes('اسلام') ||
    hay.includes('إسلام') ||
    hay.includes('عروض كتب إسلامية') ||
    hay.includes('قصص أطفال اسلامية')
  ) return 'islamic-library';

  if (
    hay.includes('ناطقة بالقلم') ||
    hay.includes('القلم الناطق')
  ) return 'smart-pen';

  if (hay.includes('القراءة المتدرجة')) return 'self-reading';

  if (
    hay.includes('تفاعلية') ||
    hay.includes('تفاغلية') ||
    hay.includes('تفاعلية متحركة') ||
    hay.includes('علب تفاعلية')
  ) return 'interactive-books';

  if (hay.includes('ثلاثية الأبعاد')) return 'stories-world';

  if (
    hay.includes('قصص الأطفال') ||
    hay.includes('قصص أطفال')
  ) return 'single-stories';

  if (
    hay.includes('مكتبتي عربي') ||
    hay.includes('كتب تعليمية')
  ) return 'favorite-books';

  return 'all-products';
}

function getCategoryLabelForProduct(rawProduct) {
  const key = getCollectionKeyForProduct(rawProduct);
  if (key) return COLLECTIONS[key].name;
  return (rawProduct.type && String(rawProduct.type).trim()) ? String(rawProduct.type).trim() : 'عام';
}

// ===== Collections Manager Class =====
class CollectionsManager {
  constructor(options = {}) {
    this.products = [];
    this._rawProducts = [];
    this.collections = new Map();
    this.init();
  }

  async init() {
    // تهيئة المجموعات
    for (const key of COLLECTION_PRIORITY) {
      const col = COLLECTIONS[key];
      if (col) {
        this.collections.set(key, {
          key,
          name: col.name,
          description: col.description,
          icon: col.icon,
          tags: col.tags,
          products: []
        });
      }
    }
  }

async loadProducts() {
  try {
    const urls = [
      '/data/products_grouped.json',
      './data/products_grouped.json',
      '/products_grouped.json',
      './products_grouped.json',
      '/data/products.json',
      './data/products.json',
      '/products.json',
      './products.json'
    ];

    let data = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          data = await res.json();
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!Array.isArray(data)) {
      console.warn('لم يتم تحميل بيانات المنتجات، استخدام بيانات افتراضية');
      this._rawProducts = this.getDefaultProducts();
    } else {
      this._rawProducts = data.filter(p => p && typeof p === 'object');
    }

    this.processProducts();

  } catch (error) {
    console.error('خطأ في تحميل المنتجات:', error);
    this._rawProducts = this.getDefaultProducts();
    this.processProducts();
  }
}

  processProducts() {
    // تنظيف المنتجات في كل مجموعة
    for (const collection of this.collections.values()) {
      collection.products = [];
    }

    // توزيع المنتجات على المجموعات
    for (const rawProduct of this._rawProducts) {
      const collectionKey = getCollectionKeyForProduct(rawProduct);
      
      if (collectionKey && this.collections.has(collectionKey)) {
        const collection = this.collections.get(collectionKey);
        collection.products.push(rawProduct);
      }
    }

    // تحديث عدد المنتجات في كل مجموعة
    for (const collection of this.collections.values()) {
      collection.productCount = collection.products.length;
    }
  }

  getAllCollections() {
    const result = [];
    for (const key of COLLECTION_PRIORITY) {
      const col = this.collections.get(key);
      if (col) {
        result.push(col);
      }
    }
    return result;
  }

  getCollectionByKey(key) {
    return this.collections.get(key) || null;
  }

  getProductsByCollection(key) {
    const col = this.collections.get(key);
    return col ? col.products : [];
  }

  getDefaultProducts() {
    return [
      {
        id: 'default-1',
        handle: 'default-1',
        title: 'ألعاب الألغاز الذكية',
        body_html: '<p>مجموعة ألغاز تطور التفكير النقدي والإبداع</p>',
        type: 'ألعاب تعليمية',
        tags: ['تعليمي', 'ذكاء'],
        published: true,
        status: 'active',
        images: [],
        variants: [{ price: 18.0 }]
      },
      {
        id: 'default-2',
        handle: 'default-2',
        title: 'روبوت تعليمي',
        body_html: '<p>روبوت ذكي لتعلم البرمجة والتحكم</p>',
        type: 'تكنولوجيا',
        tags: ['روبوت', 'برمجة'],
        published: true,
        status: 'active',
        images: [],
        variants: [{ price: 45.0 }]
      }
    ];
  }
}

// إنشاء نسخة عامة من المدير
let collectionsManager = null;

function initCollectionsManager() {
  if (!collectionsManager) {
    collectionsManager = new CollectionsManager();
  }
  return collectionsManager;
}

// التهيئة عند تحميل البرنامج
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initCollectionsManager();
  });
}

// للاستخدام من ملفات أخرى
if (typeof window !== 'undefined') {
  window.CollectionsManager = CollectionsManager;
  window.initCollectionsManager = initCollectionsManager;
  window.COLLECTIONS = COLLECTIONS;
}

// للاستخدام في Node.js (إن وجد)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CollectionsManager,
    initCollectionsManager,
    COLLECTIONS,
    COLLECTION_PRIORITY,
    getCollectionKeyForProduct,
    getCategoryLabelForProduct
  };
}