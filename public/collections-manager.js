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
    name: 'الأفضل مبيعاً',
    description: 'أكثر المنتجات مبيعاً والمفضلة عند العملاء',
    tags: ['الأفضل مبيعاً', 'bestseller', 'best seller', 'أكثر مبيعاً'],
    icon: '⭐'
  },
  'latest-releases': {
    name: 'أحدث الإصدارات',
    description: 'أحدث المنتجات والإصدارات الجديدة',
    tags: ['إصدارات جديدة', 'أحدث', 'جديد', 'new'],
    icon: '🆕'
  },
  'audio-stories': {
    name: 'القصص الصوتية التعليمية للأطفال',
    description: 'قصص صوتية مسموعة مع صور جميلة',
    tags: ['قصصي الصوتية المسموعة', 'صوتية', 'مسموعة', 'صوت', 'ناطق', 'القلم الناطق'],
    icon: '🎧'
  },
  'interactive-offers': {
    name: 'عروض الأطفال المبتكرون',
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
    name: 'القصص التعليمية التفاعلية',
    description: 'كتب وقصص تفاعلية مع أنشطة حركية',
    tags: ['كتبي التفاعلية الحركية', 'تفاعلية', 'تفاعلية حركية', 'متحركة', 'علب تفاعلية', 'حركية'],
    icon: '🤸'
  },
  'islamic-library': {
    name: 'المجموعات الإسلامية المميزة',
    description: 'كتب وقصص إسلامية تعليمية',
    tags: ['عروض مكتبتي الإسلامية', 'إسلامية', 'اسلامية', 'مكتبة إسلامية', 'قصص أطفال اسلامية', 'قصص الأنبياء', 'الله وربي', 'نتعلم من آية'],
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
    name: 'الكتب المحببة للأطفال',
    description: 'الكتب الكلاسيكية والمحبوبة من الأطفال',
    tags: ['الكتب المحببة للأطفال', 'محببة', 'المفضلة', 'مكتبتي عربي', 'كتب تعليمية'],
    icon: '💝'
  },
  'all-products': {
    name: 'كل المنتجات',
    description: 'جميع المنتجات والعروض المتاحة',
    tags: ['جميع المنتجات', 'all products'],
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

function _buildProductHaystack(product) {
  const tags = _getProductTags(product).join(' ');
  const title = _norm(product.title || product.name || '');
  const type = _norm(product.type || product.category || '');
  const desc = _norm(_stripHtml(product.description || product.body_html || ''));
  const vendor = _norm(product.vendor || '');
  return `${title} ${type} ${desc} ${tags} ${vendor}`;
}

function _includesAny(haystack, words = []) {
  return words.some(word => {
    const w = _norm(word);
    return w && haystack.includes(w);
  });
}

function _matchesCollection(product, collection) {
  const hay = _buildProductHaystack(product);
  const colTags = (collection.tags || []).map(_norm);

  if (_includesAny(hay, colTags)) return true;

  const productTags = _getProductTags(product);
  for (const pt of productTags) {
    for (const ct of colTags) {
      if (!pt || !ct) continue;
      if (pt.includes(ct) || ct.includes(pt)) return true;
    }
  }

  return false;
}

function getCollectionKeyForProduct(product) {
  const hay = _buildProductHaystack(product);

  if (hay.includes('مونتيسوري') || hay.includes('montessori')) return 'montessori';

  if (
    hay.includes('الأفضل مبيعاً') ||
    hay.includes('أفضل مبيع') ||
    hay.includes('bestseller') ||
    hay.includes('best seller')
  ) return 'bestsellers';

  if (
    hay.includes('جديد') ||
    hay.includes('أحدث') ||
    hay.includes('إصدارات جديدة') ||
    hay.includes('new release')
  ) return 'latest-releases';

  if (
    hay.includes('صوتية') ||
    hay.includes('مسموعة') ||
    hay.includes('كتب تعليمية صوتية') ||
    hay.includes('قصص أطفال صوتية') ||
    hay.includes('قصص تربوية وكتب صوتية') ||
    hay.includes('صوت الحيوانات') ||
    hay.includes('ناطق')
  ) return 'audio-stories';

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
  ) return 'islamic-library';

  if (
    hay.includes('ناطقة بالقلم') ||
    hay.includes('القلم الناطق') ||
    hay.includes('قلم ناطق')
  ) return 'smart-pen';

  if (
    hay.includes('القراءة المتدرجة') ||
    hay.includes('أنا أقرأ بنفسي') ||
    hay.includes('قراءة مستقلة')
  ) return 'self-reading';

  if (
    hay.includes('تفاعلية') ||
    hay.includes('تفاغلية') ||
    hay.includes('تفاعلية متحركة') ||
    hay.includes('علب تفاعلية') ||
    hay.includes('حركية') ||
    hay.includes('متحركة')
  ) return 'interactive-books';

  if (
    hay.includes('ثلاثية الأبعاد') ||
    hay.includes('قصص مصورة') ||
    hay.includes('حكايات مصورة')
  ) return 'stories-world';

  if (
    hay.includes('قصص الأطفال') ||
    hay.includes('قصص أطفال') ||
    hay.includes('قصص مفردة')
  ) return 'single-stories';

  if (
    hay.includes('عرض') ||
    hay.includes('عروض') ||
    hay.includes('offer') ||
    hay.includes('offers')
  ) return 'interactive-offers';

  if (
    hay.includes('موسوعات التاريخ') ||
    hay.includes('تاريخ مصور') ||
    hay.includes('موسوعات')
  ) return 'history-encyclopedia';

  if (
    hay.includes('مكتبتي عربي') ||
    hay.includes('كتب تعليمية') ||
    hay.includes('محببة') ||
    hay.includes('المفضلة')
  ) return 'favorite-books';

  for (const key of COLLECTION_PRIORITY) {
    const collection = COLLECTIONS[key];
    if (collection && _matchesCollection(product, collection)) {
      return key;
    }
  }

  return 'all-products';
}

class CollectionsManager {
  constructor() {
    this.products = [];
    this._rawProducts = [];
    this.collections = new Map();
    this.init();
  }

  init() {
    this.collections.clear();

    for (const key of COLLECTION_PRIORITY) {
      const col = COLLECTIONS[key];
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
    const urls = [
      '/products.json',
      './products.json',
      '/data/products.json',
      './data/products.json',
      '/products_grouped.json',
      './products_grouped.json',
      '/data/products_grouped.json',
      './data/products_grouped.json'
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
      } catch (e) {}
    }

    if (!Array.isArray(data)) {
      console.warn('لم يتم تحميل بيانات المنتجات، سيتم استخدام بيانات افتراضية');
      data = this.getDefaultProducts();
    }

    this._rawProducts = data.filter(item => item && typeof item === 'object');
    this.products = [...this._rawProducts];
    this.processProducts();
    return this._rawProducts;
  }

  processProducts() {
    for (const collection of this.collections.values()) {
      collection.products = [];
      collection.productCount = 0;
    }

    for (const product of this._rawProducts) {
      const key = getCollectionKeyForProduct(product);
      const selected = this.collections.get(key);
      const all = this.collections.get('all-products');

      if (selected) selected.products.push(product);
      if (all && key !== 'all-products') all.products.push(product);
    }

    for (const collection of this.collections.values()) {
      collection.productCount = collection.products.length;
    }
  }

  getAllCollections() {
    return COLLECTION_PRIORITY.map(key => this.collections.get(key)).filter(Boolean);
  }

  getCollectionByKey(key) {
    return this.collections.get(key) || null;
  }

  getProductsByCollection(key) {
    const collection = this.getCollectionByKey(key);
    return collection ? collection.products : [];
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

let collectionsManager = null;

function initCollectionsManager() {
  if (!collectionsManager) {
    collectionsManager = new CollectionsManager();
  }
  if (typeof window !== 'undefined') {
    window.collectionsManager = collectionsManager;
  }
  return collectionsManager;
}

if (typeof window !== 'undefined') {
  window.CollectionsManager = CollectionsManager;
  window.COLLECTIONS = COLLECTIONS;
  window.COLLECTION_PRIORITY = COLLECTION_PRIORITY;
  window.getCollectionKeyForProduct = getCollectionKeyForProduct;
  window.initCollectionsManager = initCollectionsManager;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initCollectionsManager();
  });
}