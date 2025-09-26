"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getCollections } from '../lib/shopify';

export default function Home() {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const fetchedCollections = await getCollections();
        setCollections(fetchedCollections);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    }
    fetchCollections();
  }, []);

  const handleAddToCart = (collectionId, collectionTitle) => {
    // Prevent default link behavior when clicking button
    event.preventDefault();
    event.stopPropagation();
    
    // Add to cart logic here
    console.log(`Adding ${collectionTitle} to cart`);
    
    // You can implement actual cart functionality here
    // For now, just show an alert
    alert(`تمت إضافة ${collectionTitle} إلى عربة التسوق!`);
  };

  return (
    <>
      {/* Hero Section - Interactive Audio Educational Display */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>العرض التعليمي التفاعلي الصوتي</h1>
          <p>أصوات الحيوانات + يوم في حياة طفل</p>
          <Link href="/collections/عروض-القصص-التفاعلية" className="hero-btn">
            اطلب العرض
          </Link>
          <div className="hero-number">12345</div>
        </div>
      </section>

      {/* Education Kids Boxes */}
      <section className="education-boxes">
        <div className="section-content">
          <h2>Education Kids Boxes</h2>
          <p>Letters And Words</p>
          <Link href="/products/حقيبة-أنا-أركب-الكلمات" className="section-btn">
            العرض المدرسي المميز
          </Link>
        </div>
      </section>

      {/* Audio Books Section */}
      <section className="audio-section">
        <div className="audio-content">
          <h2>المسلم الصغير 4 كتب صوتية للأطفال 🔊</h2>
          <div className="audio-features">
            <div className="audio-device-image">
              {/* Placeholder for audio device image */}
            </div>
            <Link href="/collections/قصصي-الصوتية-المسموعة" className="section-btn">
              تصفح المكتبة الصوتية
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Stories Offers */}
      <section className="collections-section">
        <h2>عروض القصص التفاعلية</h2>
        <div className="products-grid">
          {collections.slice(0, 24).map((collection, index) => (
            <Link key={collection.handle} href={`/collections/${collection.handle}`} className="product-card">
              <div className="product-image">
                {collection.image && (
                  <img src={collection.image.src} alt={collection.title} />
                )}
                <span className="sale-badge">عرض خاص</span>
              </div>
              <div className="product-info">
                <h3>{collection.title}</h3>
                <div className="price-info">
                  <span className="regular-price">40.000 KWD</span>
                  <span className="sale-price">عرض خاص 33.000 KWD</span>
                </div>
                <button 
                  className="add-to-cart-btn"
                  onClick={(e) => handleAddToCart(collection.handle, collection.title)}
                >
                  أضف إلى عربة التسوق
                </button>
              </div>
            </Link>
          ))}
        </div>
        <div className="view-all-link">
          <Link href="/collections/عروض-القصص-التفاعلية">
            1of24 مشاهدة الكل
          </Link>
        </div>
      </section>

      {/* Latest Releases */}
      <section className="collections-section">
        <h2>اكتشف أحدث إصداراتنا للأطفال</h2>
        <div className="products-grid">
          {collections.slice(0, 24).map((collection, index) => (
            <Link key={`latest-${collection.handle}`} href={`/collections/${collection.handle}`} className="product-card">
              <div className="product-image">
                {collection.image && (
                  <img src={collection.image.src} alt={collection.title} />
                )}
                {index < 8 && <span className="sale-badge">عرض خاص</span>}
              </div>
              <div className="product-info">
                <h3>{collection.title}</h3>
                <div className="price-info">
                  {index < 8 ? (
                    <>
                      <span className="regular-price">18.000 KWD</span>
                      <span className="sale-price">عرض خاص 14.500 KWD</span>
                    </>
                  ) : (
                    <span className="regular-price">12.500 KWD</span>
                  )}
                </div>
                <button 
                  className="add-to-cart-btn"
                  onClick={(e) => handleAddToCart(collection.handle, collection.title)}
                >
                  أضف إلى عربة التسوق
                </button>
              </div>
            </Link>
          ))}
        </div>
        <div className="view-all-link">
          <Link href="/collections/اكتشف-أحدث-إصداراتنا-للأطفال">
            1of24 مشاهدة الكل
          </Link>
        </div>
      </section>

      {/* Progressive Stories */}
      <section className="progressive-stories">
        <h2>القصص التدريجية</h2>
        <div className="video-section">
          <div className="video-placeholder">
            {/* Video placeholder for progressive reading levels */}
          </div>
        </div>
      </section>

      {/* Islamic Stories */}
      <section className="islamic-stories">
        <h2>القصص الإسلامية</h2>
        <p>مجموعة كتب إسلامية رائعة للصغار</p>
        <div className="islamic-links">
          <Link href="/collections/عروض-مكتبتي-الإسلامية">تصفح القصص الإسلامية</Link>
          <Link href="/collections/كتبي-التفاعلية-الحركية">تصفح الكتب التفاعلية</Link>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="collections-section">
        <h2>👇🏻المجموعات المتميزة</h2>
        <div className="products-grid">
          {collections.slice(0, 24).map((collection, index) => (
            <Link key={`featured-${collection.handle}`} href={`/collections/${collection.handle}`} className="product-card">
              <div className="product-image">
                {collection.image && (
                  <img src={collection.image.src} alt={collection.title} />
                )}
                <span className="sale-badge">عرض خاص</span>
              </div>
              <div className="product-info">
                <h3>{collection.title}</h3>
                <div className="price-info">
                  <span className="regular-price">26.000 KWD</span>
                  <span className="sale-price">عرض خاص 17.500 KWD</span>
                </div>
                <button 
                  className="add-to-cart-btn"
                  onClick={(e) => handleAddToCart(collection.handle, collection.title)}
                >
                  أضف إلى عربة التسوق
                </button>
              </div>
            </Link>
          ))}
        </div>
        <div className="view-all-link">
          <Link href="/collections/الكُتب-المُحببة-للأطفال">
            1of24 مشاهدة الكل
          </Link>
        </div>
      </section>

      {/* Islamic Collections */}
      <section className="islamic-collections">
        <h2>مجموعات إسلامية مميزة 🕋</h2>
        <div className="section-description">
          <p>تعرفوا على عروض مكتبتي الإسلامية</p>
          <p>مجموعة مختارة من الكتب الصوتية الإسلامية والقصص الدينية المبسطة التي تنمي مهارات أطفالك وتغذي عقولهم بالقيم الدينية والتربوية</p>
          <p>اجعل تعلمهم ممتعًا ومفيدًا مع أفضل العروض في عالم الكتب الإسلامية</p>
        </div>
        <div className="products-grid">
          {collections.slice(0, 17).map((collection, index) => (
            <Link key={`islamic-${collection.handle}`} href={`/collections/${collection.handle}`} className="product-card">
              <div className="product-image">
                {collection.image && (
                  <img src={collection.image.src} alt={collection.title} />
                )}
                <span className="sale-badge">عرض خاص</span>
              </div>
              <div className="product-info">
                <h3>{collection.title}</h3>
                <div className="price-info">
                  <span className="regular-price">26.000 KWD</span>
                  <span className="sale-price">عرض خاص 17.500 KWD</span>
                </div>
                <button 
                  className="add-to-cart-btn"
                  onClick={(e) => handleAddToCart(collection.handle, collection.title)}
                >
                  أضف إلى عربة التسوق
                </button>
              </div>
            </Link>
          ))}
        </div>
        <div className="view-all-link">
          <Link href="/collections/عروض-مكتبتي-الإسلامية">
            1of17 مشاهدة الكل
          </Link>
        </div>
      </section>

      <style jsx>{`
        /* Hero Section */
        .hero-section {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          padding: 4rem 2rem;
          text-align: center;
          position: relative;
        }

        .hero-content h1 {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .hero-content p {
          font-size: 1.5rem;
          margin-bottom: 2rem;
        }

        .hero-btn {
          display: inline-block;
          background: #fbbf24;
          color: #1f2937;
          padding: 1rem 2rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
          font-size: 1.1rem;
          transition: all 0.3s ease;
        }

        .hero-btn:hover {
          background: #f59e0b;
          transform: translateY(-2px);
        }

        .hero-number {
          position: absolute;
          top: 2rem;
          right: 2rem;
          font-size: 1.2rem;
          font-weight: 600;
        }

        /* Education Boxes */
        .education-boxes {
          background: #f3f4f6;
          padding: 4rem 2rem;
          text-align: center;
        }

        .education-boxes h2 {
          font-size: 2.5rem;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .education-boxes p {
          font-size: 1.2rem;
          color: #6b7280;
          margin-bottom: 2rem;
        }

        /* Audio Section */
        .audio-section {
          padding: 4rem 2rem;
          background: white;
          text-align: center;
        }

        .audio-section h2 {
          font-size: 2.2rem;
          color: #1f2937;
          margin-bottom: 2rem;
        }

        .audio-device-image {
          width: 300px;
          height: 200px;
          background: #e5e7eb;
          margin: 2rem auto;
          border-radius: 8px;
        }

        /* Collections Sections */
        .collections-section {
          padding: 4rem 2rem;
          background: #ffffff;
        }

        .collections-section h2 {
          font-size: 2.2rem;
          color: #1f2937;
          text-align: center;
          margin-bottom: 3rem;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .product-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          text-decoration: none;
          color: inherit;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .product-image {
          position: relative;
          width: 100%;
          height: 200px;
          background: #f3f4f6;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sale-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #ef4444;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .product-info {
          padding: 1.5rem;
        }

        .product-info h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .price-info {
          margin-bottom: 1rem;
        }

        .regular-price {
          color: #6b7280;
          text-decoration: line-through;
          margin-right: 0.5rem;
        }

        .sale-price {
          color: #ef4444;
          font-weight: 600;
        }

        .add-to-cart-btn {
          width: 100%;
          background: #4f46e5;
          color: white;
          padding: 0.75rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .add-to-cart-btn:hover {
          background: #3730a3;
        }

        .view-all-link {
          text-align: center;
          margin-top: 3rem;
        }

        .view-all-link a {
          color: #4f46e5;
          font-weight: 600;
          text-decoration: none;
          font-size: 1.1rem;
        }

        .view-all-link a:hover {
          text-decoration: underline;
        }

        /* Progressive Stories */
        .progressive-stories {
          background: #f9fafb;
          padding: 4rem 2rem;
          text-align: center;
        }

        .progressive-stories h2 {
          font-size: 2.2rem;
          color: #1f2937;
          margin-bottom: 2rem;
        }

        .video-placeholder {
          width: 100%;
          max-width: 600px;
          height: 300px;
          background: #e5e7eb;
          margin: 0 auto;
          border-radius: 8px;
        }

        /* Islamic Stories */
        .islamic-stories {
          background: white;
          padding: 4rem 2rem;
          text-align: center;
        }

        .islamic-stories h2 {
          font-size: 2.2rem;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        .islamic-stories p {
          color: #6b7280;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }

        .islamic-links {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .islamic-links a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
        }

        .islamic-links a:hover {
          text-decoration: underline;
        }

        /* Islamic Collections */
        .islamic-collections {
          background: #f9fafb;
          padding: 4rem 2rem;
        }

        .islamic-collections h2 {
          font-size: 2.2rem;
          color: #1f2937;
          text-align: center;
          margin-bottom: 2rem;
        }

        .section-description {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 3rem;
        }

        .section-description p {
          color: #6b7280;
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 1rem;
        }

        .section-btn {
          display: inline-block;
          background: #4f46e5;
          color: white;
          padding: 1rem 2rem;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .section-btn:hover {
          background: #3730a3;
          transform: translateY(-2px);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .hero-content h1 {
            font-size: 2rem;
          }

          .hero-content p {
            font-size: 1.2rem;
          }

          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 1rem;
          }

          .islamic-links {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </>
  );
}