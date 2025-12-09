// مدير المجموعات - تصنيف وعرض المنتجات حسب المجموعات
class CollectionsManager {
    constructor() {
        this.collections = {
            'montessori': {
                name: 'مونتيسوري',
                description: 'منتجات مونتيسوري التعليمية المتخصصة لتنمية مهارات الطفل',
                tags: ['مونتيسوري', 'Montessori'],
                icon: '🎯'
            },
            'stories-world': {
                name: 'عالم القصص والحكايات المصورة',
                description: 'مجموعة شاملة من القصص والحكايات المصورة للأطفال',
                tags: ['عالم القصص', 'حكايات مصورة', 'قصص مصورة'],
                icon: '📚'
            },
            'bestsellers': {
                name: 'Smart Kids Kuwait الأطفال المبتكرون الكويت الأفضل مبيعاً',
                description: 'أكثر المنتجات مبيعاً من Smart Kids Kuwait',
                tags: ['الأفضل مبيعاً', 'bestseller', 'أكثر مبيعاً'],
                icon: '⭐'
            },
            'latest-releases': {
                name: 'اكتشف أحدث إصداراتنا للأطفال',
                description: 'أحدث وأجدد إصدارات الكتب والألعاب التعليمية',
                tags: ['اكتشف أحدث إصداراتنا للأطفال', 'إصدارات جديدة', 'أحدث'],
                icon: '🆕'
            },
            'audio-stories': {
                name: 'قصصي الصوتية المسموعة',
                description: 'القصص الصوتية التفاعلية للاستماع والتعلم',
                tags: ['قصصي الصوتية المسموعة', 'صوتية', 'مسموعة'],
                icon: '🎧'
            },
            'interactive-offers': {
                name: 'عروض القصص التفاعلية',
                description: 'عروض خاصة على القصص التفاعلية والكتب الذكية',
                tags: ['عروض القصص التفاعلية', 'تفاعلية', 'عروض خاصة'],
                icon: '🎁'
            },
            'single-stories': {
                name: 'القصص المفردة للأطفال',
                description: 'قصص منفردة متنوعة لجميع الأعمار',
                tags: ['القصص المفردة للأطفال', 'االقصص المفردة للأطفال', 'قصص مفردة'],
                icon: '📖'
            },
            'self-reading': {
                name: 'أنا أقرأ بنفسي',
                description: 'كتب مصممة لتشجيع الطفل على القراءة المستقلة',
                tags: ['أنا أقرأ بنفسي', 'قراءة مستقلة'],
                icon: '👶'
            },
            'interactive-books': {
                name: 'كتبي التفاعلية الحركية',
                description: 'الكتب التفاعلية التي تحفز الحركة والنشاط',
                tags: ['كتبي التفاعلية الحركية', 'تفاعلية حركية'],
                icon: '🤸'
            },
            'islamic-library': {
                name: 'عروض مكتبتي الإسلامية',
                description: 'مكتبة إسلامية شاملة للأطفال والعائلة',
                tags: ['عروض مكتبتي الإسلامية', 'إسلامية', 'مكتبة إسلامية'],
                icon: '🕌'
            },
            'smart-pen': {
                name: 'ابدأ رحلتك مع القلم الناطق',
                description: 'منتجات القلم الناطق التفاعلي للتعلم الذكي',
                tags: ['ابدأ رحلتك مع القلم الناطق', 'قلم ناطق', 'ناطق'],
                icon: '🖊️'
            },
            'history-encyclopedia': {
                name: 'موسوعات التاريخ المصور',
                description: 'موسوعات تاريخية مصورة للأطفال',
                tags: ['موسوعات التاريخ المصور', 'تاريخ مصور', 'موسوعات'],
                icon: '🏛️'
            },
            'favorite-books': {
                name: 'الكُتب المُحببة للأطفال',
                description: 'أكثر الكتب محبة لدى الأطفال',
                tags: ['الكُتب المُحببة للأطفال', 'محببة', 'المفضلة'],
                icon: '💝'
            },
            'all-products': {
                name: 'تسوق جميع منتجاتنا الآن',
                description: 'جميع منتجات Smart Kids Kuwait في مكان واحد',
                tags: ['تسوق جميع منتجاتنا الآن', 'جميع المنتجات'],
                icon: '🛍️'
            }
        };
        this.products = [];
    }

    async loadProducts() {
        try {
            const response = await fetch('./data/products_grouped.json');
            if (!response.ok) throw new Error('فشل في تحميل المنتجات');
            
            const data = await response.json();
            this.products = data.filter(product => product.published && product.status === 'active');
            
            return this.products;
        } catch (error) {
            console.error('خطأ في تحميل المنتجات:', error);
            return [];
        }
    }

    getCollectionProducts(collectionKey) {
        const collection = this.collections[collectionKey];
        if (!collection) return [];

        if (collectionKey === 'all-products') {
            return this.products; // جميع المنتجات
        }

        // البحث في العلامات (tags) أولاً
        let filteredProducts = this.products.filter(product => {
            if (product.tags && Array.isArray(product.tags)) {
                return product.tags.some(tag => 
                    collection.tags.some(collectionTag => 
                        tag.includes(collectionTag) || collectionTag.includes(tag)
                    )
                );
            }
            return false;
        });

        // إذا لم نجد منتجات في العلامات، نبحث في النوع والعنوان
        if (filteredProducts.length === 0) {
            filteredProducts = this.products.filter(product => {
                const searchText = `${product.title || ''} ${product.type || ''} ${product.body_html || ''}`.toLowerCase();
                return collection.tags.some(tag => 
                    searchText.includes(tag.toLowerCase())
                );
            });
        }

        return filteredProducts;
    }

    getAllCollections() {
        return Object.keys(this.collections).map(key => ({
            key,
            ...this.collections[key],
            productCount: this.getCollectionProducts(key).length
        }));
    }

    getCollectionByKey(key) {
        const collection = this.collections[key];
        if (!collection) return null;

        return {
            key,
            ...collection,
            products: this.getCollectionProducts(key),
            productCount: this.getCollectionProducts(key).length
        };
    }

    // تحديث عدد المنتجات لكل مجموعة
    updateProductCounts() {
        Object.keys(this.collections).forEach(key => {
            this.collections[key].productCount = this.getCollectionProducts(key).length;
        });
    }
}

// إنشاء مثيل عالمي
let collectionsManager;

document.addEventListener('DOMContentLoaded', async function() {
    collectionsManager = new CollectionsManager();
    await collectionsManager.loadProducts();
    collectionsManager.updateProductCounts();
});