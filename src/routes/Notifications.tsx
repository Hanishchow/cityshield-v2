import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import type { Notification } from '@shared/contract.ts';
import { SERVICE_KEYS } from '@shared/contract.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { useMarkRead, useNotifications, useUnread } from '@/lib/api/hooks.ts';
import { useUI } from '@/store/ui.ts';
import { Card } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Segmented, Skeleton } from '@/components/ui/controls.tsx';
import { Empty, HeaderAction, MobileHeader, NotificationRow } from '@/components/common.tsx';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { useT } from '@/i18n/index.ts';

/** Open whatever a notification refers to, marking it read. */
export function openNotification(n: Notification, nav: NavigateFunction, markRead: (ids: string[]) => void) {
  if (n.readAt == null) markRead([n.id]);
  if (n.refType === 'complaint' && n.refId) nav(`/complaints/${n.refId}`);
  else if ((SERVICE_KEYS as readonly string[]).includes(n.tone)) nav(`/service/${n.tone}`);
}

export default function Notifications() {
  const t = useT(), desk = useIsDesktop(), nav = useNavigate();
  const q = useNotifications(), unread = useUnread(), read = useMarkRead();
  const f = useUI((s) => s.ntfFilter), set = useUI((s) => s.set);
  usePageMeta({ title: t('notifications'), sub: unread ? `${unread} unread` : 'You are all caught up', side: 'notifications' });
  const list = (q.data ?? []).filter((n) => f === 'all' || n.kind === f);
  const body = (
    <div className="flex flex-col gap-3.5">
      <Segmented label="Filter notifications" value={f} onChange={(v) => set({ ntfFilter: v })}
        options={[{ value: 'all', label: 'All' }, { value: 'emergency', label: 'Emergency' }, { value: 'service', label: 'Service' }, { value: 'complaint', label: 'Complaint' }]} />
      <Card className="divide-y divide-line overflow-hidden">
        {q.isLoading ? <Skeleton className="m-4 h-32" /> : list.length ? list.map((n) => <NotificationRow key={n.id} n={n} onClick={() => openNotification(n, nav, read.mutate)} />)
          : <Empty icon="bell">No notifications here.</Empty>}
      </Card>
    </div>
  );
  if (!desk) return (
    <div>
      <MobileHeader title={t('notifications')} sub={unread ? `${unread} unread` : undefined} action={<HeaderAction icon="check" label="Mark all as read" onClick={() => read.mutate(null)} />} />
      <div className="p-4">{body}</div>
    </div>
  );
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-3 p-6">
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => read.mutate(null)} disabled={!unread}><CheckCheck />Mark all as read</Button></div>
      {body}
    </div>
  );
}
