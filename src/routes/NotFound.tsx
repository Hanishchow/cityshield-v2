import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { usePageMeta } from '@/app/pageMeta.ts';
import { openSheet } from '@/app/overlayStore.ts';
import { Button } from '@/components/ui/button.tsx';
import { ShieldMark } from '@/components/brand/Logo.tsx';

export default function NotFound() {
  const nav = useNavigate();
  usePageMeta({ title: 'Page not found', side: null });
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-8 text-center">
      <ShieldMark className="h-20 w-[72px]" />
      <h1 className="text-[22px] font-extrabold">That page does not exist</h1>
      <p className="max-w-[340px] text-[14px] text-fg-2">The link may be old. Help is still one tap away.</p>
      <div className="flex gap-3">
        <Button onClick={() => nav('/')}>Go home</Button>
        <Button variant="danger" onClick={() => openSheet({ kind: 'dial', num: '112' })}><Phone />Call 112</Button>
      </div>
    </div>
  );
}
