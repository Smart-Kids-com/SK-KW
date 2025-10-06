"use client";
import { useEffect } from 'react';

export default function StructuredData() {
  useEffect(() => {
    // Organization Schema
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Smart Kids KW",
      "alternateName": "سمارت كيدز الكويت",
      "url": "https://smartkidskw.com",
      "logo": "https://smartkidskw.com/logo-sk-smart-kids.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+965-50424642",
        "contactType": "customer service",
        "availableLanguage": ["Arabic", "English"]
      },
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "KW",
        "addressLocality": "الكويت"
      },
      "sameAs": [
        "https://wa.me/96550424642"
      ]
    };

    // WebSite Schema
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Smart Kids KW",
      "alternateName": "سمارت كيدز الكويت",
      "url": "https://smartkidskw.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://smartkidskw.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };

    // Store Schema
    const storeSchema = {
      "@context": "https://schema.org",
      "@type": "Store",
      "name": "Smart Kids KW",
      "description": "متجر الألعاب التعليمية والقصص التفاعلية للأطفال في الكويت",
      "url": "https://smartkidskw.com",
      "telephone": "+965-50424642",
      "priceRange": "1-100 KWD",
      "paymentAccepted": "Cash, Credit Card",
      "currenciesAccepted": "KWD",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "KW",
        "addressLocality": "الكويت"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "29.3759",
        "longitude": "47.9774"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
          "opens": "09:00",
          "closes": "22:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Friday", "Saturday"],
          "opens": "10:00",
          "closes": "23:00"
        }
      ]
    };

    // إضافة Schema إلى الصفحة
    const addSchema = (schema, id) => {
      const existingScript = document.getElementById(id);
      if (existingScript) {
        existingScript.remove();
      }
      
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = id;
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    };

    addSchema(organizationSchema, 'organization-schema');
    addSchema(websiteSchema, 'website-schema');
    addSchema(storeSchema, 'store-schema');

  }, []);

  return null;
}