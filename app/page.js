// app/page.js
"use client";

import {homepage} from "@/lib/homepageData";
import HomeSlider from "@/components/HomeSlider";


export default function HomePage() {
  return (
    <main>
      <HomeSlider slides={homepage.slidesPrimary} />
      <HomeSlider slides={homepage.slidesSecondary} variant="secondary" />
  </main>
);
}