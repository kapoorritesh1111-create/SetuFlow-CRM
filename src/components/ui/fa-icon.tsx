import type { SVGProps } from 'react';
import { siWhatsapp } from 'simple-icons/icons';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Camera,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  CreditCard,
  Database,
  File,
  FileCheck,
  FileDown,
  FileText,
  Flag,
  Folder,
  Globe2,
  Home,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Lock,
  Mail,
  MessageCircle,
  Package,
  Paperclip,
  Phone,
  Plane,
  Plug,
  Puzzle,
  QrCode,
  Rocket,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Ship,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tags,
  Truck,
  UserCircle,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function BrandSvgIcon({ path, className, ...props }: SVGProps<SVGSVGElement> & { path: string }) {
  return (
    <svg aria-hidden="true" role="img" viewBox="0 0 24 24" className={className} fill="currentColor" {...props}>
      <path d={path} />
    </svg>
  );
}

const BRAND_ICONS = {
  whatsapp: siWhatsapp.path,
};

const ICONS: Record<string, LucideIcon> = {
  address: UserCircle,
  'address-card-o': UserCircle,
  archive: Package,
  'bar-chart': BarChart3,
  bars: LayoutDashboard,
  bell: Bell,
  'bell-o': Bell,
  billing: CreditCard,
  briefcase: Briefcase,
  building: Building2,
  'building-o': Building2,
  calendar: Calendar,
  camera: Camera,
  'check-square-o': CheckSquare,
  circle: Circle,
  'circle-o': Circle,
  cogs: Settings,
  'comments-o': MessageCircle,
  database: Database,
  dashboard: LayoutDashboard,
  envelope: Mail,
  'envelope-open-o': Mail,
  exchange: Send,
  file: File,
  'file-o': File,
  'file-check': FileCheck,
  'file-down': FileDown,
  'file-pdf-o': FileText,
  pdf: FileText,
  'file-text': FileText,
  'file-text-o': FileText,
  filter: SlidersHorizontal,
  flag: Flag,
  folder: Folder,
  globe: Globe2,
  'globe-2': Globe2,
  history: ShieldCheck,
  home: Home,
  integrations: Puzzle,
  key: KeyRound,
  lock: Lock,
  'line-chart': LineChart,
  magic: Sparkles,
  mail: Mail,
  'paper-plane-o': Send,
  paperclip: Paperclip,
  phone: Phone,
  plane: Plane,
  plug: Plug,
  puzzle: Puzzle,
  qrcode: QrCode,
  rocket: Rocket,
  send: Send,
  settings: Settings,
  shield: Shield,
  'shield-check': ShieldCheck,
  ship: Ship,
  'shopping-bag': ShoppingBag,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  tags: Tags,
  times: X,
  truck: Truck,
  users: Users,
  'user-circle-o': UserCircle,
  warning: AlertTriangle,
  wrench: Wrench,
  'angle-left': ChevronLeft,
  'angle-right': ChevronRight,
};

export function FaIcon({
  icon,
  className,
  fixedWidth = false,
}: {
  icon: string;
  className?: string;
  fixedWidth?: boolean;
}) {
  const brandPath = BRAND_ICONS[icon as keyof typeof BRAND_ICONS];
  if (brandPath) return <BrandSvgIcon path={brandPath} className={cn('inline-block h-[1em] w-[1em]', fixedWidth && 'shrink-0', className)} />;
  const Icon = ICONS[icon] ?? Circle;
  return <Icon aria-hidden="true" className={cn('inline-block h-[1em] w-[1em] stroke-[2.1]', fixedWidth && 'shrink-0', className)} />;
}
