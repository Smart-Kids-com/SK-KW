// Collections Manager - إدارة المجموعات والمنتجات
// نسخة محسّنة وثابتة مع دعم كامل لـ 14 مجموعة

const COLLECTIONS = {
  montessori: {
    name: 'مونتيسوري',
    description: 'ألعاب وأدوات تعليمية وفقاً لنظام مونتيسوري',
    tags: ['مونتيسوري', 'montessori'],
    icon: '🎯'
  },
  'stories-world': {
    name: 'عالم القصص والحكايات المصورة',
    description: 'قصص مصورة جميلة وحكايات تفاعلية للأطفال',
    tags: ['عالم القصص', 'حكايات مصورة', 'قصص مصورة', 'ثلاثية الأبعاد', '3d'],
    icon: '📚'
  },
  bestsellers: {
    name: 'Smart Kids Kuwait الأطفال المبتكرون الكويت الأفضل مبيعاً',
    description: 'أكثر المنتجات مبيعاً والمفضلة عند العملاء',
    tags: ['الأفضل مبيعاً', 'bestseller', 'best seller', 'أكثر مبيعاً'],
    icon: '⭐'
  },
  'latest-releases': {
    name: 'اكتشف أحدث إصداراتنا للأطفال',
    description: 'أحدث المنتجات والإصدارات الجديدة',
    tags: ['إصدارات جديدة', 'أحدث', 'جديد', 'new'],
    icon: '🆕'
  },
  'audio-stories': {
    name: 'قصصي الصوتية المسموعة',
    description: 'قصص صوتية مسموعة مع صور جميلة',
    tags: ['قصصي الصوتية المسموعة', 'صوتية', 'مسموعة', 'صوت', 'ناطق'],
    icon: '🎧'
  },
  'interactive-offers': {
    name: 'عروض القصص التفاعلية',
    description: 'عروض خاصة على القصص والكتب التفاعلية',
    tags: ['عروض القصص التفاعلية', 'عروض', 'عرض', 'offer', 'offers'],
    icon: '🎁'
  },
  'single-stories': {
    name: 'القصص المفردة للأطفال',
    description: 'قصص مفردة موضوعية متنوعة',
    tags: ['القصص المفردة للأطفال', 'قصص مفردة', 'قصص الأطفال', 'قصص أطفال'],
    icon: '📖'
  },
  'self-reading': {
    name: 'أنا أقرأ بنفسي',
    description: 'كتب تعليم القراءة المستقلة للأطفال',
    tags: ['أنا أقرأ بنفسي', 'قراءة مستقلة', 'القراءة المتدرجة'],
    icon: '👶'
  },
  'interactive-books': {
    name: 'كتبي التفاعلية الحركية',
    description: 'كتب تفاعلية مع أنشطة حركية',
    tags: ['كتبي التفاعلية الحركية', 'تفاعلية', 'تفاعلية حركية', 'متحركة', 'علب تفاعلية'],
    icon: '🤸'
  },
  'islamic-library': {
    name: 'عروض مكتبتي الإسلامية',
    description: 'كتب وقصص إسلامية تعليمية',
    tags: ['عروض مكتبتي الإسلامية', 'إسلامية', 'اسلامية', 'مكتبة إسلامية', 'قصص أطفال اسلامية'],
    icon: '🕌'
  },
  'smart-pen': {
    name: 'ابدأ رحلتك مع القلم الناطق',
    description: 'أقلام ناطقة وكتب صوتية تفاعلية',
    tags: ['ابدأ رحلتك مع القلم الناطق', 'قلم ناطق', 'ناطق', 'القلم الناطق', 'ناطقة بالقلم'],
    icon: '🖊️'
  },
  'history-encyclopedia': {
    name: 'موسوعات التاريخ المصور',
    description: 'موسوعات تاريخية مصورة بجودة عالية',
    tags: ['موسوعات التاريخ المصور', 'تاريخ مصور', 'موسوعات', 'تاريخ'],
    icon: '🏛️'
  },
  'favorite-books': {
    name: 'الكُتب المُحببة للأطفال',
    description: 'الكتب الكلاسيكية والمحبوبة من الأطفال',
    tags: ['الكُتب المُحببة للأطفال', 'محببة', 'المفضلة', 'مكتبتي عربي', 'كتب تعليمية'],
    icon: '💝'
  },
  'all-products': {
    name: 'تسوق جميع منتجاتنا الآن',
    description: 'جميع المنتجات والعروض المتاحة',
    tags: ['تسوق جميع منتجاتنا الآن', 'جميع المنتجات', 'all products'],
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

// -------------------- Helpers --------------------

function _norm(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function _stripHtml(html) {
  return String(html ?? '').replace(/<[^>]*>/g, ' ');
}

function _splitToArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function _getProductTags(product) {
  return _splitToArray(product.tags).map(_norm);
}

function _buildProductHaystack(rawProduct) {
  const tags = _getProductTags(rawProduct).join(' ');
  const title = _norm(rawProduct.title || rawProduct.name || '');
  const type = _norm(rawProduct.type || rawProduct.category || '');
  const desc = _norm(_stripHtml(rawProduct.description || rawProduct.body_html || ''));
  const vendor = _norm(rawProduct.vendor || '');
  return `${title} ${type} ${desc} ${tags} ${vendor}`;
}

function _includesAny(haystack, words = []) {
  return words.some(word => {
    const w = _norm(word);
    return w && haystack.includes(w);
  });
}

function _matchesCollection(rawProduct, collection) {
  const hay = _buildProductHaystack(rawProduct);
  const colTags = (collection.tags || []).map(_norm);

  if (_includesAny(hay, colTags)) return true;

  const productTags = _getProductTags(rawProduct);
  for (const pt of productTags) {
    for (const ct of colTags) {
      if (!pt || !ct) continue;
      if (pt.includes(ct) || ct.includes(pt)) return true;
    }
  }

  return false;
}

// -------------------- Main Classification --------------------

function getCollectionKeyForProduct(rawProduct) {
  const hay = _buildProductHaystack(rawProduct);

  if (hay.includes('مونتيسوري') || hay.includes('montessori')) {
    return 'montessori';
  }

  if (
    hay.includes('الأفضل مبيعاً') ||
    hay.includes('أفضل مبيع') ||
    hay.includes('bestseller') ||
    hay.includes('best seller')
  ) {
    return 'bestsellers';
  }

  if (
    hay.includes('جديد') ||
    hay.includes('أحدث') ||
    hay.includes('إصدارات جديدة') ||
    hay.includes('new release')
  ) {
    return 'latest-releases';
  }

  if (
    hay.includes('صوتية') ||
    hay.includes('مسموعة') ||
    hay.includes('كتب تعليمية صوتية') ||
    hay.includes('قصص أطفال صوتية') ||
    hay.includes('قصص تربوية وكتب صوتية') ||
    hay.includes('صوت الحيوانات') ||
    hay.includes('ناطق')
  ) {
    return 'audio-stories';
  }

  if (
    hay.includes('اسلام') ||
    hay.includes('إسلام') ||
    hay.includes('اسلامية') ||
    hay.includes('إسلامية') ||
    hay.includes('عروض كتب إسلامية') ||
    hay.includes('قصص أطفال اسلامية') ||
    hay.includes('قصص الأنبياء') ||
    hay.includes('الله وربي') ||
    hay.includes('نتعلم من آية') ||
    hay.includes('الصحبة الصالحة')
  ) {
    return 'islamic-library';
  }

  if (
    hay.includes('ناطقة بالقلم') ||
    hay.includes('القلم الناطق') ||
    hay.includes('قلم ناطق')
  ) {
    return 'smart-pen';
  }

  if (
    hay.includes('القراءة المتدرجة') ||
    hay.includes('أنا أقرأ بنفسي') ||
    hay.includes('قراءة مستقلة')
  ) {
    return 'self-reading';
  }

  if (
    hay.includes('تفاعلية') ||
    hay.includes('تفاغلية') ||
    hay.includes('تفاعلية متحركة') ||
    hay.includes('علب تفاعلية') ||
    hay.includes('حركية') ||
    hay.includes('متحركة')
  ) {
    return 'interactive-books';
  }

  if (
    hay.includes('ثلاثية الأبعاد') ||
    hay.includes('قصص مصورة') ||
    hay.includes('حكايات مصورة')
  ) {
    return 'stories-world';
  }

  if (
    hay.includes('قصص الأطفال') ||
    hay.includes('قصص أطفال') ||
    hay.includes('قصص مفردة')
  ) {
    return 'single-stories';
  }

  if (
    hay.includes('عرض') ||
    hay.includes('عروض') ||
    hay.includes('offer') ||
    hay.includes('offers')
  ) {
    return 'interactive-offers';
  }

  if (
    hay.includes('موسوعات التاريخ') ||
    hay.includes('تاريخ مصور') ||
    hay.includes('موسوعات')
  ) {
    return 'history-encyclopedia';
  }

  if (
    hay.includes('مكتبتي عربي') ||
    hay.includes('كتب تعليمية') ||
    hay.includes('محببة') ||
    hay.includes('المفضلة')
  ) {
    return 'favorite-books';
  }

  for (const key of COLLECTION_PRIORITY) {
    const collection = COLLECTIONS[key];
    if (collection && _matchesCollection(rawProduct, collection)) {
      return key;
    }
  }

  return 'all-products';
}

function getCategoryLabelForProduct(rawProduct) {
  const key = getCollectionKeyForProduct(rawProduct);
  if (key && COLLECTIONS[key]) return COLLECTIONS[key].name;

  const fallback = rawProduct.category || rawProduct.type;
  return String(fallback || 'عام').trim();
}

// -------------------- Collections Manager --------------------

class CollectionsManager {
  constructor(options = {}) {
    this.options = options;
    this.products = [];
    this._rawProducts = [];
    this.collections = new Map();
    this.init();
  }

  init() {
    this.collections.clear();

    for (const key of COLLECTION_PRIORITY) {
      const col = COLLECTIONS[key];
      if (!col) continue;

      this.collections.set(key, {
        key,
        name: col.name,
        description: col.description,
        icon: col.icon,
        tags: col.tags || [],
        products: [],
        productCount: 0
      });
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
          if (!res.ok) continue;

          const json = await res.json();
          if (Array.isArray(json)) {
            data = json;
            break;
          }
        } catch (_) {
          // ignore and continue
        }
      }

      if (!Array.isArray(data)) {
        console.warn('لم يتم تحميل بيانات المنتجات، سيتم استخدام بيانات افتراضية');
        this._rawProducts = this.getDefaultProducts();
      } else {
        this._rawProducts = data.filter(p => p && typeof p === 'object');
      }

      this.products = [...this._rawProducts];
      this.processProducts();
      return this._rawProducts;
    } catch (error) {
      console.error('خطأ في تحميل المنتجات:', error);
      this._rawProducts = this.getDefaultProducts();
      this.products = [...this._rawProducts];
      this.processProducts();
      return this._rawProducts;
    }
  }

  processProducts() {
    for (const collection of this.collections.values()) {
      collection.products = [];
      collection.productCount = 0;
    }

    for (const rawProduct of this._rawProducts) {
      const collectionKey = getCollectionKeyForProduct(rawProduct);
      const collection = this.collections.get(collectionKey);

      if (collection) {
        collection.products.push(rawProduct);
      }

      const allProductsCollection = this.collections.get('all-products');
      if (allProductsCollection && collectionKey !== 'all-products') {
        allProductsCollection.products.push(rawProduct);
      }
    }

    for (const collection of this.collections.values()) {
      collection.productCount = collection.products.length;
    }
  }

  getAllCollections() {
    return COLLECTION_PRIORITY
      .map(key => this.collections.get(key))
      .filter(Boolean);
  }

  getCollectionByKey(key) {
    return this.collections.get(key) || null;
  }

  getProductsByCollection(key) {
    const col = this.getCollectionByKey(key);
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
        images: [],
        variants: [{ price: 45.0 }]
      }
    ];
  }
}

// -------------------- Global Init --------------------

let collectionsManager = null;

function initCollectionsManager() {
  if (!collectionsManager) {
    collectionsManager = new CollectionsManager();
  }
  return collectionsManager;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initCollectionsManager();
  });
}

if (typeof window !== 'undefined') {
  window.CollectionsManager = CollectionsManager;
  window.initCollectionsManager = initCollectionsManager;
  window.COLLECTIONS = COLLECTIONS;
  window.COLLECTION_PRIORITY = COLLECTION_PRIORITY;
  window.getCollectionKeyForProduct = getCollectionKeyForProduct;
  window.getCategoryLabelForProduct = getCategoryLabelForProduct;
  window.collectionsManager = collectionsManager;
}

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