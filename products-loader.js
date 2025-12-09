// تحميل وعرض المنتجات من ملف JSON
class ProductsLoader {
    constructor() {
        this.products = [];
        this.currentCategory = 'الكل';
        this.init();
    }

    async init() {
        try {
            await this.loadProducts();
            this.renderProducts();
            this.setupFilters();
        } catch (error) {
            console.error('خطأ في تحميل المنتجات:', error);
            this.showError();
        }
    }

    async loadProducts() {
        try {
            // تحميل المنتجات من ملف products.json الجديد
            const response = await fetch('./products.json');
            if (!response.ok) throw new Error('فشل في تحميل الملف');
            
            const data = await response.json();
            
            // استخدام البيانات مباشرة
            this.products = data.map(product => ({
                id: product.id,
                name: product.title,
                description: product.description,
                price: product.price,
                image: product.emoji || '🎁',
                category: product.category,
                tags: [],
                vendor: 'Smart Kids Kuwait',
                inStock: product.inStock
            }));
                
        } catch (error) {
            console.error('خطأ في معالجة البيانات:', error);
            // في حالة فشل التحميل، استخدم بيانات تجريبية
            this.products = this.getDefaultProducts();
        }
    }

    extractDescription(bodyHtml) {
        if (!bodyHtml) return 'وصف المنتج غير متوفر';
        
        // إزالة HTML tags وأخذ النص فقط
        const div = document.createElement('div');
        div.innerHTML = bodyHtml;
        const text = div.textContent || div.innerText || '';
        
        // أخذ أول 150 حرف
        return text.length > 150 ? text.substring(0, 150) + '...' : text;
    }

    extractPrice(product) {
        // البحث عن السعر في variants
        if (product.variants && product.variants.length > 0) {
            const variant = product.variants[0];
            if (variant.price && variant.price > 0) {
                return parseFloat(variant.price);
            }
        }
        
        // إذا لم يجد السعر، استخدم سعر افتراضي حسب نوع المنتج
        const productType = (product.type || '').toLowerCase();
        if (productType.includes('كتاب') || productType.includes('قصة')) {
            return 15.0; // كتب وقصص
        } else if (productType.includes('علبة') || productType.includes('مونتيسوري')) {
            return 25.0; // علب تعليمية
        } else if (productType.includes('عرض') || productType.includes('مجموعة')) {
            return 35.0; // عروض ومجموعات
        }
        
        return 20.0; // سعر افتراضي عام
    }

    extractImage(product) {
        if (product.images && product.images.length > 0) {
            return product.images[0].src;
        }
        
        // صورة افتراضية
        return 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(product.title || 'منتج');
    }

    getDefaultProducts() {
        // منتجات افتراضية في حالة فشل التحميل
        return [
            {
                id: 'default-1',
                name: 'ألعاب الألغاز الذكية',
                description: 'مجموعة ألغاز تطور التفكير النقدي والإبداع',
                price: 18.0,
                image: 'https://via.placeholder.com/300x300?text=ألغاز',
                category: 'ألعاب تعليمية',
                tags: ['تعليمي', 'ذكاء']
            },
            {
                id: 'default-2', 
                name: 'روبوت تعليمي',
                description: 'روبوت ذكي لتعلم البرمجة والتحكم',
                price: 45.0,
                image: 'https://via.placeholder.com/300x300?text=روبوت',
                category: 'تكنولوجيا',
                tags: ['روبوت', 'برمجة']
            }
        ];
    }

    renderProducts(productsToShow = null) {
        const productsContainer = document.getElementById('products');
        if (!productsContainer) return;

        const products = productsToShow || this.products;
        
        if (products.length === 0) {
            productsContainer.innerHTML = `
                <div style="text-align: center; grid-column: 1 / -1; padding: 3rem;">
                    <h3>لا توجد منتجات متوفرة</h3>
                    <p>يرجى المحاولة لاحقاً أو تحديث الصفحة</p>
                </div>
            `;
            return;
        }

        productsContainer.innerHTML = products.map(product => `
            <div class="product" data-category="${product.category}" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" 
                         onerror="this.src='https://via.placeholder.com/300x300?text=${encodeURIComponent(product.name)}'">
                </div>
                <div class="product-info">
                    <div class="product-title">${product.name}</div>
                    <div class="product-description">${product.description}</div>
                    <div class="product-category">التصنيف: ${product.category}</div>
                    <div class="product-price">${product.price.toFixed(3)} د.ك</div>
                    <button class="add-to-cart" onclick="addToCart('${product.name}', ${product.price}, '${product.id}')">
                        إضافة للسلة
                    </button>
                </div>
            </div>
        `).join('');

        // إضافة معلومات إحصائية
        this.updateStats(products.length);
    }

    setupFilters() {
        // إنشاء قائمة الفئات
        const categories = [...new Set(this.products.map(p => p.category))];
        categories.unshift('الكل'); // إضافة خيار "الكل" في البداية
        
        // إنشاء أزرار الفلترة
        const filtersContainer = document.getElementById('categoryFilters') || this.createFiltersContainer();
        
        filtersContainer.innerHTML = categories.map(category => `
            <button class="filter-btn ${category === 'الكل' ? 'active' : ''}" 
                    onclick="productsLoader.filterByCategory('${category}')">
                ${category} ${category === 'الكل' ? `(${this.products.length})` : `(${this.products.filter(p => p.category === category).length})`}
            </button>
        `).join('');
    }

    createFiltersContainer() {
        const container = document.createElement('div');
        container.id = 'categoryFilters';
        container.className = 'category-filters';
        
        // إدراج قبل container المنتجات
        const productsContainer = document.getElementById('products');
        if (productsContainer && productsContainer.parentNode) {
            productsContainer.parentNode.insertBefore(container, productsContainer);
        }
        
        return container;
    }

    filterByCategory(category) {
        this.currentCategory = category;
        
        // تحديث أزرار الفلترة
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // فلترة وعرض المنتجات
        const filteredProducts = category === 'الكل' 
            ? this.products 
            : this.products.filter(p => p.category === category);
            
        this.renderProducts(filteredProducts);
    }

    searchProducts(query) {
        if (!query.trim()) {
            this.renderProducts();
            return;
        }
        
        const filtered = this.products.filter(product => 
            product.name.includes(query) || 
            product.description.includes(query) ||
            product.tags.some(tag => tag.includes(query))
        );
        
        this.renderProducts(filtered);
    }

    updateStats(count) {
        // إضافة إحصائية عدد المنتجات
        let statsElement = document.getElementById('productsStats');
        if (!statsElement) {
            statsElement = document.createElement('div');
            statsElement.id = 'productsStats';
            statsElement.className = 'products-stats';
            
            const productsContainer = document.getElementById('products');
            if (productsContainer && productsContainer.parentNode) {
                productsContainer.parentNode.insertBefore(statsElement, productsContainer);
            }
        }
        
        statsElement.innerHTML = `
            <div class="stats-info">
                📊 إجمالي المنتجات: <strong>${count}</strong> منتج
                ${this.currentCategory !== 'الكل' ? `في فئة: <strong>${this.currentCategory}</strong>` : ''}
            </div>
        `;
    }

    showError() {
        const productsContainer = document.getElementById('products');
        if (productsContainer) {
            productsContainer.innerHTML = `
                <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: #dc3545;">
                    <h3>⚠️ خطأ في تحميل المنتجات</h3>
                    <p>حدث خطأ أثناء تحميل قائمة المنتجات. يرجى تحديث الصفحة أو المحاولة لاحقاً.</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 1rem; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        تحديث الصفحة
                    </button>
                </div>
            `;
        }
    }
}

// تشغيل المحمل عند تحميل الصفحة
let productsLoader;
document.addEventListener('DOMContentLoaded', function() {
    productsLoader = new ProductsLoader();
});