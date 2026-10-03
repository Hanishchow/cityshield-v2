import { toast } from 'sonner';
import { Icon } from './icons.tsx';
import { cn } from '@/lib/utils.ts';
import { toneClass, type ToneName } from './tone.ts';

/** The app's toast: an icon chip in the service's colour plus one line of text. */
export function appToast(msg: string, icon = 'check', tone: ToneName = 'primary') {
  toast.custom(() => (
    <div className="flex w-[min(92vw,380px)] items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-[13.5px] font-semibold text-fg shadow-float" role="status">
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-xl', toneClass(tone))}>
        <Icon name={icon} className="size-4" />
      </span>
      <span className="min-w-0">{msg}</span>
    </div>
  ), { duration: 3600 });
}
