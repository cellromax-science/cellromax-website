"use client";

import { useState } from "react";
import Image from "next/image";
import { galleryUrl, thumbStripUrl } from "@/lib/image";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  thumbnailUrl: string | null;
}

export function ProductImageGallery({ images, productName, thumbnailUrl }: ProductImageGalleryProps) {
  const allImages: string[] = images.length > 0
    ? images
    : thumbnailUrl
      ? [thumbnailUrl]
      : [];

  const [activeIndex, setActiveIndex] = useState(0);

  if (allImages.length === 0) {
    return (
      <div className="aspect-square w-full squircle-xl overflow-hidden bg-gray-100 flex items-center justify-center">
        <svg className="size-16 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Image Viewer */}
      <div className="relative aspect-square w-full squircle-xl overflow-hidden bg-gray-50 border border-gray-100">
        <Image
          src={galleryUrl(allImages[activeIndex])}
          alt={`${productName} - ${activeIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          quality={75}
          className="object-contain"
          priority={activeIndex === 0}
        />
      </div>

      {/* Thumbnail Strip — 2개 이상일 때만 표시 */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="이미지 선택">
          {allImages.map((src, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === activeIndex}
              onClick={() => setActiveIndex(idx)}
              className={`relative flex-shrink-0 size-16 squircle-md overflow-hidden border-2 transition-all duration-150 ${
                idx === activeIndex
                  ? "border-secondary shadow-sm"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <Image
                src={thumbStripUrl(src)}
                alt={`${productName} ${idx + 1}`}
                fill
                sizes="64px"
                quality={60}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
