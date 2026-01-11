import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';

export function BuiltWith() {
  return (
    <Button asChild variant="outline" size="sm" className="hover:bg-primary/10">
      <Link href="https://tempadd.com" target="_blank">
        Temp Mail & Fake Email Generator ❤️ TEMPADD
      </Link>
    </Button>
  );
}
