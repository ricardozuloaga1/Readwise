'use client';

import Image from 'next/image';

export default function Logo() {
  return (
    <div className="relative w-[400px] h-[120px]">
      <Image
        src="/logo.png"
        alt="NewsWise Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
} 