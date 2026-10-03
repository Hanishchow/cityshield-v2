/**
 * Responsive sheet: a draggable bottom drawer on phones (vaul), a centred
 * dialog on desktop (Radix). Both trap focus, close on Escape and restore focus.
 */
import type { ReactNode } from 'react';
import { Drawer } from 'vaul';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { useIsDesktop } from '@/lib/useMedia.ts';

export function Sheet({ open, onOpenChange, title, children, wide, description }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode; wide?: boolean; description?: string;
}) {
  const desk = useIsDesktop();
  const head = (Title: typeof Dialog.Title) => (
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <Title className="text-[18px] font-extrabold tracking-[-0.01em]">{title}</Title>
      <button onClick={() => onOpenChange(false)} aria-label="Close" className="grid size-8 place-items-center rounded-full bg-surface-3 text-fg-2 hover:text-fg"><X className="size-4" /></button>
    </div>
  );
  if (desk) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/55 backdrop-blur-[2px]" />
          <Dialog.Content
            aria-describedby={undefined}
            className={cn('fixed top-1/2 left-1/2 z-50 max-h-[86vh] w-[calc(100vw-48px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-float outline-none', wide ? 'max-w-[760px]' : 'max-w-[480px]')}
          >
            {head(Dialog.Title)}
            {description && <Dialog.Description className="-mt-2 mb-3 text-[14px] text-fg-2">{description}</Dialog.Description>}
            {children}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-navy-950/55" />
        <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-[560px] flex-col rounded-t-[26px] border border-line bg-surface outline-none">
          <div className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" />
          <div className="overflow-y-auto px-4 pt-2 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
            {head(Drawer.Title as unknown as typeof Dialog.Title)}
            {description && <Drawer.Description className="-mt-2 mb-3 text-[14px] text-fg-2">{description}</Drawer.Description>}
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
