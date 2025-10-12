// app/page.js
"use client";

import HomeSlider from "@/components/HomeSlider";
import { slidesPrimary, slidesSecondary } from "@/lib/homepageData";

export default function HomePage() {
  return (
    <main>
      <HomeSlider slides={slidesPrimary} />
      <HomeSlider slides={slidesSecondary} variant="secondary" />
  </main>
);
}