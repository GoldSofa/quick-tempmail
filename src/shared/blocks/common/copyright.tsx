'use client';

import { useEffect, useState } from 'react';

import { envConfigs } from '@/config';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function Copyright({ brand }: { brand: BrandType }) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className={`text-muted-foreground text-sm`} suppressHydrationWarning>
      <span suppressHydrationWarning>© {currentYear || 2024} </span>
      <a
        href={brand?.url || envConfigs.app_url}
        target={brand?.target || ''}
        className="text-primary hover:text-primary/80 cursor-pointer"
        suppressHydrationWarning
      >
        {/* {brand?.title || envConfigs.app_name} */}
        TempAdd.com
      </a>
      <span suppressHydrationWarning>, All rights reserved</span>
    </div>
  );
}
