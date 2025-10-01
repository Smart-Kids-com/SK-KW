import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import Link from 'next/link';

const slides = [
  // First 5 slides
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/CACBDA84-1389-4CC4-B050-3B0244AE7EF0.png?v=1757991506",
    heading: "العرض التعليمي التفاعلي الصوتي",
    subheading: "أصوات الحيوانات+ يوم في حياة طفل",
    button_label: "اطلب العرض",
    link: "/collections/عروض-القصص-التفاعلية",
  },
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/2_ee3fd101-3134-4523-a4de-84f0b0e1048f.png?v=1751053202",
    heading: "قلمي السحري",
    subheading: "كتبي الناطقة 22 كتاباً ناطقاً بالقلم",
    button_label: "تصفح عرض الحقيبة",
    link: "/products/الحقيبة-التعليمية-الناطقة-بالقلم-عربي-إنجليزي",
  },
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/5_ba4fbd2f-e7fe-4cf7-ba1d-0e9f5e233a71.png?v=1746954628",
    heading: "القصص ثلاثية الأبعاد",
    subheading: "التشويق بكل صفحة",
    button_label: "تصفح العرض",
    link: "/products/استمتع-برحلة-تفاعلية-مع-8-قصص-ثلاثية-الأبعاد",
  },
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/F71B6DAA-F5D1-4964-9EFD-54A2EF5874B2.png?v=1746206589",
    heading: "قصص الأنبياء-12 كتاباً",
    subheading: "اقتفِ أثر الأنبياء 👣",
    button_label: "دع أطفالك يتعلمون منهم📖🕋",
    link: "/products/قصص-الأنبياء-12-25-نبياً",
  },
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/0110-8150864765604275633.jpg?v=1755421795",
    heading: "عرض ال 29 كتاباً للصغار",
    subheading: "العرض الذهبي",
    button_label: "!اطلب الآن",
    link: "/collections/الكُتب-المُحببة-للأطفال",
  },
  // Next 5 slides
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/2_b2a829e7-3d4b-49fc-baae-66c1d6f715d7.png?v=1754362385",
    heading: "Education Kids Boxes",
    subheading: "<strong>Letters And Words</strong>",
    button_label: "العرض المدرسي المميز",
    link: "/products/حقيبة-أنا-أركب-الكلمات-مع-3-حقائب-مونتيسوري-التفاعلية",
  },
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/1_3935205c-67ae-4194-bfe7-b4ec7481ee09.png?v=1751054736",
    heading: "Reading Pen",
    subheading: "With Learning Books",
    button_label: "قلم القراءة المتدرجة الناطق",
    link: "/collections/ابدأ-رحلتك-مع-القلم-الناطق",
  },
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/Slidshow.png?v=1751332513",
    heading: "Interactive Stories",
    subheading: "",
    button_label: "احصل على العرض الآن",
    link: "/collections/عروض-القصص-التفاعلية",
  },
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/Slidshow_6ce563f1-be3b-4998-b5ce-53d5ea447d37.png?v=1751332917",
    heading: "Discover The Kids 3D Stories",
    subheading: "<strong>القصص ثلاثية الأبعاد</strong>",
    button_label: "اطلب العرض",
    link: "/collections/عروض-القصص-التفاعلية",
  },
  {
    image: "https://cdn.shopify.com/s/files/1/0697/3318/7805/files/c376a0415b19dc4b35ab2f32cf34bb90.png?v=1744026189",
    heading: "Audio storybooks",
    subheading: "<strong>أصوات الحيوانات</strong>",
    button_label: "اطلبها الآن",
    link: "/collections/قصصي-الصوتية-المسموعة",
  },
];

export default function HomepageSlideshow() {
  return (
    <div className="homepage-slideshow">
      <Swiper
        spaceBetween={50}
        slidesPerView={1}
        loop={true}
        autoplay={{ delay: 4000 }}
      >
        {slides.map((slide, idx) => (
          <SwiperSlide key={idx}>
            <div className="slide-content">
              <img src={slide.image} alt={slide.heading} className="slide-image" />
              <div className="slide-text">
                <h1 className="slide-heading">{slide.heading}</h1>
                {slide.subheading && (
                  <p
                    className="slide-subheading"
                    dangerouslySetInnerHTML={{ __html: slide.subheading }}
                  />
                )}
                <Link href={slide.link} className="slide-btn">
                  {slide.button_label}
                </Link>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <style jsx>{`
        .homepage-slideshow {
          position: relative;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto 2rem auto;
          border-radius: 20px;
          overflow: hidden;
        }
        .slide-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #fff;
        }
        .slide-image {
          width: 100%;
          object-fit: cover;
          border-bottom: 1px solid #eee;
        }
        .slide-text {
          padding: 2rem;
          text-align: center;
        }
        .slide-heading {
          font-size: 2.5rem;
          font-weight: bold;
        }
        .slide-subheading {
          font-size: 1.2rem;
          margin: 1rem 0;
        }
        .slide-btn {
          display: inline-block;
          background: #eeb60f;
          color: #222;
          padding: 0.75rem 2rem;
          border-radius: 30px;
          text-decoration: none;
          font-weight: bold;
          margin-top: 1rem;
          font-size: 1.1rem;
          transition: background 0.2s;
        }
        .slide-btn:hover {
          background: #ffd700;
        }
      `}</style>
    </div>
  );
}