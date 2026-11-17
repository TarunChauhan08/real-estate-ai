'use client';

import Image from 'next/image';
import { useState } from 'react';
import { PHOTOS, type PhotoKey, photoSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

/**
 * Full-bleed photo that fills its (relatively positioned) parent.
 * If a photo ever fails to load, it disappears and the navy gradient behind it shows instead —
 * the page still looks intentional rather than broken.
 */
export function Photo({
  name,
  className,
  priority = false,
  sizes = '100vw',
}: {
  name: PhotoKey;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden bg-gradient-to-br from-brand via-brand-hover to-brand-deep',
        className,
      )}
    >
      {!failed && (
        <Image
          src={photoSrc(name)}
          alt={PHOTOS[name].alt}
          fill
          priority={priority}
          sizes={sizes}
          quality={85}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
