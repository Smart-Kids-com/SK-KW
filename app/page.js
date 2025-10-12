// app/page.js
"use client";

import { slidesPrimary, slidesSecondary, homepageData, } from "@/lib/homepageData";
import HomeSlider from "@/components/HomeSlider";


export default function HomePage() {
  return (
    <main>
      <HomeSlider slides={slidesPrimary} />
      <HomeSlider slides={slidesSecondary} variant="secondary" />
  </main>
);
}