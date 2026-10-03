/**
 * Route info card under the street map — ported from the prototype's
 * "lm-info": who is coming, every stop on the trip, live distance / ETA /
 * heading, and the unit's live position.
 */
import type { Assignment, Incident } from '@shared/contract.ts';
import { SERVICES, stationById } from '@shared/catalog.ts';
import { toLatLng } from '@shared/geo.ts';
import { Card } from '@/components/ui/card.tsx';
import { IconChip } from '@/components/common.tsx';
import { SERVICE_ICON } from '@/components/icons.tsx';
import { useProgress, Fill } from '@/features/sim/live.tsx';
import { compass, statusOf } from './StreetMap.tsx';
import { serverNow } from '@/lib/api/connection.ts';
import { shortArea } from '@/lib/utils.ts';
import { openSheet } from '@/app/overlayStore.ts';
import { ClipboardList } from 'lucide-react';

const TITLE: Record<string, string> = { police: 'Police Unit', ambulance: 'Ambulance', fire: 'Fire Truck', civic: 'Garbage Vehicle', crew: 'Repair Crew' };
const SUB: Record<string, string> = { police: 'Karnataka State Police', ambulance: 'Emergency medical service · 108', fire: 'Fire & Emergency Services', civic: 'Garbage collection · Zone 3', crew: 'Civic repair' };

export function RouteInfo({ a, incident }: { a: Assignment; incident: Incident }) {
  const pr = useProgress(a, 500)!;
  const col = SERVICES[a.kind].color;
  const st = statusOf(a, serverNow());
  const hosp = a.kind === 'ambulance' && incident.destinationHospitalId ? stationById(incident.destinationHospitalId) : null;
  const stops: [string, string, string][] = [['Dispatched from', a.originName, col]];
  stops.push([a.kind === 'civic' ? 'Assigned area' : a.kind === 'ambulance' ? 'Pickup · emergency location' : 'Destination · emergency location', shortArea(incident.address), a.kind === 'civic' ? '#059669' : '#DC2F35']);
  if (hosp) stops.push([`Hospital · ${hosp.beds === 'available' ? 'Available' : hosp.beds === 'limited' ? 'Limited beds' : 'Full'}`, hosp.name, '#2A56C6']);
  /* schematic heading: 0 rad = east, y grows south → compass bearing */
  const bearing = ((pr.heading * 180) / Math.PI + 90 + 360) % 360;
  const ll = toLatLng(pr.pos);
  return (
    <Card className="flex flex-col gap-3.5 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <IconChip icon={SERVICE_ICON[a.kind]} tone={a.kind === 'crew' ? 'amber' : a.kind} />
        <div className="min-w-0 flex-1">
          <div className="text-[16.5px] leading-tight font-extrabold">{TITLE[a.kind]} <span className="font-mono">{a.callSign}</span></div>
          <div className="mt-0.5 text-[13.5px] text-fg-2">{SUB[a.kind]}</div>
        </div>
        <span className="lm-stx" data-tone={st.tone}><i /><b>{pr.done ? 'ARRIVED' : 'EN ROUTE'}</b></span>
      </div>
      <ol className="flex flex-col pl-0.5">
        {stops.map(([label, name, c], i) => (
          <li key={label} className="relative flex gap-3 pb-3 last:pb-0">
            {i < stops.length - 1 && <span className="absolute top-[17px] -bottom-[3px] left-[5.5px] w-0.5 bg-line" />}
            <i className="relative z-10 mt-[3px] size-[13px] shrink-0 rounded-full border-[3px] bg-surface" style={{ borderColor: c }} />
            <div className="min-w-0"><small className="block text-[12.5px] font-semibold text-fg-3">{label}</small><b className="text-[14.5px] leading-snug">{name}</b></div>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-3 rounded-2xl border border-line bg-surface-2 [&>div+div]:border-l [&>div+div]:border-line">
        <div className="min-w-0 px-3 py-2.5"><small className="block text-[12.5px] font-semibold text-fg-2">Distance</small><b className="mt-0.5 block text-[18px] font-extrabold tabular">{pr.done ? '0 km' : `${pr.km} km`}</b></div>
        <div className="min-w-0 px-3 py-2.5"><small className="block text-[12.5px] font-semibold text-fg-2">ETA</small><b className="mt-0.5 block text-[18px] font-extrabold tabular">{pr.done ? 'Arrived' : `${pr.etaMin} min`}</b></div>
        <div className="min-w-0 px-3 py-2.5"><small className="block text-[12.5px] font-semibold text-fg-2">Heading</small><b className="mt-0.5 block text-[18px] font-extrabold">{pr.done ? '—' : compass(bearing)}</b></div>
      </div>
      <Fill a={a} />
      <div className="text-[13px] text-fg-2">Live position <b className="ml-1 text-fg tabular">{ll.lat.toFixed(5)}, {ll.lng.toFixed(5)}</b></div>
      <button onClick={() => openSheet({ kind: 'trip', svc: a.kind as never, incidentId: incident.id })}
        className="inline-flex items-center gap-1.5 self-start rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-fg-2 hover:text-fg">
        <ClipboardList className="size-4" />Trip details
      </button>
    </Card>
  );
}
