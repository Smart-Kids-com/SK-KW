// app/page.js
"use client";

import {homepage as homepageData} from "@/lib/homepageData";
import HomeSlider from "@/components/HomeSlider";


export default function HomePage() {
  return (
    <main>
      <HomeSlider slides={homepageData} />
      <HomeSlider slides={homepageData} variant="main" />
  </main>
);
}