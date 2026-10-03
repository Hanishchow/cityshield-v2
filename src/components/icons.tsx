/**
 * Prototype icon names → lucide-react. Data from the API refers to icons by
 * these short names (e.g. a notification's `icon`), so the mapping lives here.
 */
import {
  Activity, Ambulance, ArrowLeft, Bell, Briefcase, Building2, Camera, Car, Check, ChevronRight, CircleCheck, CircleEllipsis,
  CircleHelp, ClipboardList, Clock, Droplets, Dumbbell, Ellipsis, ExternalLink, Flame, Globe, Heart, Hospital, House, Image,
  Info, LayoutGrid, Layers, LocateFixed, Lock, LogOut, MapPin, Mic, MicOff, Minus, Moon, Navigation, Network, Pencil, Phone,
  PhoneOff, Plus, Radar, RefreshCw, Search, Send, Settings, Shield, ShieldCheck, Siren, Sun, SwitchCamera, Timer, TrafficCone,
  Trash2, TriangleAlert, Truck, User, Users, Video, Volume2, X, Lightbulb, type LucideIcon, type LucideProps,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  home: House, clipboard: ClipboardList, pin: MapPin, track: Radar, more: CircleEllipsis, phone: Phone, phoneOff: PhoneOff,
  video: Video, nav: Navigation, police: Shield, ambulance: Ambulance, fire: Flame, bin: Trash2, back: ArrowLeft, clock: Clock,
  chev: ChevronRight, check: Check, checkC: CircleCheck, bell: Bell, user: User, settings: Settings, help: CircleHelp, info: Info,
  edit: Pencil, plus: Plus, brief: Briefcase, gym: Dumbbell, heartHome: Heart, signal: TrafficCone, drop: Droplets, bulb: Lightbulb,
  dots: Ellipsis, car: Car, hospital: Hospital, truck: Truck, search: Search, x: X, camera: Camera, globe: Globe, activity: Activity,
  grid: LayoutGrid, external: ExternalLink, timer: Timer, siren: Siren, mic: Mic, micOff: MicOff, speaker: Volume2, flip: SwitchCamera,
  send: Send, layers: Layers, refresh: RefreshCw, locate: LocateFixed, minus: Minus, sun: Sun, moon: Moon, alert: TriangleAlert,
  users: Users, building: Building2, shieldCheck: ShieldCheck, lock: Lock, image: Image, logout: LogOut, nodes: Network, crew: Truck, civic: Trash2,
};

export function Icon({ name, ...p }: { name: string } & LucideProps) {
  const C = ICONS[name] ?? Info;
  return <C aria-hidden="true" strokeWidth={2} {...p} />;
}

/** Service key → icon name used on tiles and markers. */
export const SERVICE_ICON: Record<string, string> = { police: 'police', ambulance: 'ambulance', fire: 'fire', civic: 'bin', crew: 'truck' };
