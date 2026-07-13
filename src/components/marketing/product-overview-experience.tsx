'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';

type OverviewPage = {
  slug: string;
  number: number;
  short: string;
  title: string;
  description: string;
  bullets: string[];
  stat?: Array<[string, string]>;
  visual: 'hero' | 'journey' | 'workspaces' | 'discover' | 'capture' | 'relationship' | 'research' | 'communication' | 'catalog' | 'vcard' | 'commercial' | 'supplier' | 'orders' | 'analytics' | 'integrations' | 'security';
};

const pages: OverviewPage[] = [
  { slug: 'welcome', number: 1, short: 'Welcome', title: 'One platform. Every step of global trade.', description: 'From first contact to final delivery, Setu Flow connects every team, every process, and every opportunity.', bullets: ['Discover opportunities', 'Capture relationships', 'Control commercial activity', 'Execute orders', 'Grow with insight'], stat: [['10K+', 'Active users'], ['80+', 'Countries'], ['25K+', 'Companies'], ['$2B+', 'Trade value']], visual: 'hero' },
  { slug: 'journey', number: 2, short: 'Business Journey', title: 'The complete Setu Flow journey', description: 'A connected end-to-end workflow built specifically for importers, exporters, and global trade teams.', bullets: ['Discover', 'Capture', 'Research', 'Communicate', 'Convert', 'Execute', 'Grow'], visual: 'journey' },
  { slug: 'workspaces', number: 3, short: 'Workspaces', title: 'One connected platform', description: 'Every workspace has a clear purpose while customer, supplier, product, pricing, document, and execution context stays connected.', bullets: ['Lead Workspace', 'Supplier Workspace', 'Commercial Workspace', 'Order Workspace', 'Catalog & Price Lists', 'Communication Hub', 'Analytics & Insights', 'Setu Guru'], visual: 'workspaces' },
  { slug: 'discover', number: 4, short: 'Discover', title: 'Find the right opportunities', description: 'Use AI-powered discovery, ICP matching, market intelligence, and Setu Guru research to identify the opportunities worth pursuing.', bullets: ['AI opportunity discovery', 'Growth Center', 'ICP Builder', 'Market intelligence', 'Competitor insights'], visual: 'discover' },
  { slug: 'capture', number: 5, short: 'Capture', title: 'Capture leads anywhere', description: 'Turn every trade-show conversation, business card, QR scan, web inquiry, WhatsApp message, or manual entry into a structured CRM record.', bullets: ['Trade shows', 'Business card scan', 'QR capture', 'Manual entry', 'Website forms', 'WhatsApp', 'Email import'], visual: 'capture' },
  { slug: 'relationships', number: 6, short: 'Relationships', title: 'Your relationship command center', description: 'Everything your team needs to understand, progress, and grow a buyer or supplier relationship in one place.', bullets: ['Timeline and activities', 'Contacts and companies', 'Tasks and follow-ups', 'Notes and documents', 'Products of interest', 'Communication history'], visual: 'relationship' },
  { slug: 'research', number: 7, short: 'Research', title: 'Know before you connect', description: 'Bring company, market, import-export, product, supplier, competitor, certification, and news context into a decision-ready view.', bullets: ['Buyer insights', 'Import-export intelligence', 'Product intelligence', 'Supplier intelligence', 'Certifications', 'Market news'], visual: 'research' },
  { slug: 'communication', number: 8, short: 'Communication', title: 'Every conversation connected', description: 'Coordinate email, WhatsApp, LinkedIn, calls, meetings, tasks, reminders, and follow-ups from one shared timeline.', bullets: ['Email', 'WhatsApp', 'LinkedIn', 'Calls and meetings', 'Tasks', 'Calendar sync'], visual: 'communication' },
  { slug: 'catalog', number: 9, short: 'Catalog & Prices', title: 'Present products professionally', description: 'Manage products, categories, collections, media, and market-specific price lists, then share a buyer-safe experience with tracked engagement.', bullets: ['Product catalog', 'Categories and collections', 'Country price lists', 'Currency views', 'Buyer-safe sharing', 'View tracking'], visual: 'catalog' },
  { slug: 'vcard', number: 10, short: 'Digital Card', title: 'Share your identity in seconds', description: 'Give every team member a professional digital business card connected to the company profile, catalog, price list, website, and QR identity.', bullets: ['Digital vCard', 'Company profile', 'QR code', 'WhatsApp share', 'Email share', 'Catalog and price list'], visual: 'vcard' },
  { slug: 'commercial', number: 11, short: 'Commercial', title: 'Create, compare, approve, and win', description: 'Build quotes, compare suppliers, review price intelligence, protect margin, route approvals, and track every commercial outcome.', bullets: ['Quote Builder', 'Pricing intelligence', 'RFQs', 'Supplier comparison', 'Margin analysis', 'Approvals'], visual: 'commercial' },
  { slug: 'suppliers', number: 12, short: 'Suppliers', title: 'Build a stronger supply base', description: 'Capture, verify, compare, approve, and manage suppliers with capabilities, compliance, documents, RFQs, and performance visibility.', bullets: ['Supplier capture', 'Verification', 'Compliance', 'Documents', 'RFQ and cost requests', 'Preferred suppliers'], visual: 'supplier' },
  { slug: 'orders', number: 13, short: 'Orders', title: 'Deliver with confidence', description: 'Move accepted business into order readiness, documents, packing, freight, dispatch, shipment milestones, and proof of delivery.', bullets: ['Order management', 'Documents', 'Packing and labeling', 'Freight and shipping', 'Dispatch tracking', 'Shipment timeline'], visual: 'orders' },
  { slug: 'analytics', number: 14, short: 'Analytics', title: 'Know. Improve. Grow.', description: 'Understand conversion, pipeline movement, revenue, trade-show ROI, supplier performance, bottlenecks, and team effectiveness.', bullets: ['Pipeline overview', 'Conversion funnel', 'Revenue and forecast', 'Trade-show ROI', 'Team performance', 'Custom reports'], stat: [['$2.45M', 'Pipeline'], ['312', 'Qualified'], ['32%', 'Win rate'], ['28', 'Orders won']], visual: 'analytics' },
  { slug: 'integrations', number: 15, short: 'Integrations', title: 'Connect the tools you already use', description: 'Keep Setu Flow connected to the communication, calendar, data, and business tools your teams depend on every day.', bullets: ['Outlook', 'Gmail', 'WhatsApp Business', 'Google Calendar', 'Supabase', 'More integrations'], visual: 'integrations' },
  { slug: 'security', number: 16, short: 'Security', title: 'Enterprise-grade security and trust', description: 'Protect customer and company data with role-aware access, auditability, encryption, recovery, and a secure operating foundation.', bullets: ['SOC 2 Type II', 'GDPR aligned', 'Role-based access', 'Data encryption', 'Audit logs', 'Backup and recovery'], visual: 'security' },
];

function Icon({ index }: { index: number }) {
  const icons = ['◎', '↗', '▦', '⌕', '+', '◉', '◌', '✉', '▤', '⌁', '◇', '♙', '▣', '⌁', '∞', '◆'];
  return <span aria-hidden="true" className="text-lg font-black">{icons[index] ?? '•'}</span>;
}

function ShellCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,.06)] ${className}`}>{children}</div>;
}

function ProductVisual({ page }: { page: OverviewPage }) {
  if (page.visual === 'hero') {
    return (
      <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_72%_28%,rgba(45,212,191,.30),transparent_28%),linear-gradient(145deg,#071f46,#0b3971_58%,#0f766e)] p-7 text-white sm:p-10">
        <div className="absolute right-[-4rem] top-10 h-72 w-72 rounded-full border border-white/20 bg-blue-300/10" />
        <div className="absolute right-10 top-20 h-48 w-48 rounded-full border border-white/20" />
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-200">Trade execution CRM</p>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">From first contact<br />to final delivery.</h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-blue-100">One connected operating system for buyers, suppliers, products, quotes, documents, orders, and shipment execution.</p>
        </div>
        <div className="relative z-10 mt-12 flex items-end gap-3">
          <div className="h-16 w-32 rounded-t-xl bg-teal-400/80" />
          <div className="h-24 w-44 rounded-t-xl bg-white/90" />
          <div className="h-12 w-28 rounded-xl bg-blue-300/80" />
        </div>
      </div>
    );
  }

  if (page.visual === 'journey') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {page.bullets.map((item, index) => (
          <ShellCard key={item} className="relative p-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 font-black text-teal-700">{index + 1}</div>
            <p className="mt-3 text-sm font-black text-slate-900">{item}</p>
            {index < page.bullets.length - 1 ? <span className="absolute -right-2 top-8 hidden text-slate-300 lg:block">→</span> : null}
          </ShellCard>
        ))}
      </div>
    );
  }

  if (page.visual === 'workspaces') {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{page.bullets.map((item, index) => <ShellCard key={item} className="p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon index={index} /></div><p className="mt-4 font-black text-slate-950">{item}</p><p className="mt-2 text-sm leading-6 text-slate-500">Focused workspace. Shared context. Clear next action.</p></ShellCard>)}</div>;
  }

  if (page.visual === 'discover') {
    return <ShellCard className="p-5"><div className="mb-4 flex items-center justify-between"><p className="font-black text-slate-950">Top opportunities for you</p><span className="text-xs font-bold text-teal-700">View all</span></div><div className="space-y-3">{['FreshMart LLC', 'GreenFoods GmbH', 'HealthyLife UK Ltd.', 'EuroFoods BV'].map((name, index) => <div key={name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-3"><span className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-teal-100" /><div><p className="font-bold text-slate-900">{name}</p><p className="text-xs text-slate-500">High-fit buyer opportunity</p></div></div><span className="text-sm font-black text-emerald-600">Match {92 - index * 4}%</span></div>)}</div></ShellCard>;
  }

  if (page.visual === 'capture') {
    return <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><div className="mx-auto w-full max-w-xs rounded-[2rem] border-[7px] border-slate-950 bg-white p-5 shadow-2xl"><p className="text-sm font-black text-slate-950">New Lead Captured</p><div className="mt-4 h-14 rounded-xl bg-slate-100" /><div className="mt-4 space-y-2">{['Name and company', 'Phone or email', 'Country and source', 'Product interest'].map((item) => <div key={item} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">{item}</div>)}</div><button className="mt-5 w-full rounded-xl bg-teal-700 py-3 text-sm font-bold text-white">Save Lead</button></div><div className="grid gap-3 sm:grid-cols-2">{page.bullets.map((item) => <ShellCard key={item} className="p-4"><p className="font-bold text-slate-900">{item}</p><p className="mt-1 text-sm text-slate-500">Connected capture into the same CRM workflow.</p></ShellCard>)}</div></div>;
  }

  if (page.visual === 'relationship') {
    return <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><ShellCard className="p-5"><div className="flex gap-5 border-b border-slate-100 pb-4 text-sm font-bold text-slate-500"><span className="text-teal-700">Timeline</span><span>Activities</span><span>Notes</span><span>Products</span></div><div className="mt-4 space-y-3">{['WhatsApp message received', 'Email opened', 'Quote sent', 'Task created'].map((item) => <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="font-bold text-slate-900">{item}</p><p className="mt-1 text-xs text-slate-500">Recorded with owner, time, and next action.</p></div>)}</div></ShellCard><ShellCard className="p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Next action</p><p className="mt-3 text-xl font-black text-slate-950">Follow-up call</p><p className="mt-1 text-sm text-slate-500">Tomorrow, 10:00 AM</p><div className="mt-6 h-2 rounded-full bg-slate-100"><div className="h-2 w-4/5 rounded-full bg-teal-500" /></div><p className="mt-2 text-sm font-bold text-slate-700">Lead score 85/100</p></ShellCard></div>;
  }

  if (page.visual === 'research') {
    return <ShellCard className="p-6"><div className="flex flex-wrap gap-4 border-b border-slate-100 pb-4 text-sm font-bold text-slate-500"><span className="text-teal-700">Overview</span><span>Trade Data</span><span>Suppliers</span><span>Contacts</span><span>Insights</span></div><div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-5"><div className="flex items-center gap-3"><Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={42} height={42} className="h-10 w-10 rounded-full" /><p className="font-black text-teal-900">AI Summary by Setu Guru</p></div><p className="mt-3 max-w-3xl leading-7 text-slate-700">This company shows strong product-market fit, relevant import activity, and commercial signals that support a focused outreach approach. Evidence remains visible for human review.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{[['$24.5M', 'Import value'], ['Spices', 'Top category'], ['128', 'Active suppliers']].map(([value, label]) => <ShellCard key={label} className="p-4"><p className="text-2xl font-black text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></ShellCard>)}</div></ShellCard>;
  }

  if (page.visual === 'communication') {
    return <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><div className="space-y-3">{page.bullets.map((item) => <ShellCard key={item} className="p-4 font-bold text-slate-800">{item}</ShellCard>)}</div><ShellCard className="p-5"><div className="flex gap-4 border-b border-slate-100 pb-3 text-xs font-bold text-slate-500"><span className="text-teal-700">All</span><span>Email</span><span>WhatsApp</span><span>LinkedIn</span><span>Calls</span></div><div className="mt-4 space-y-3">{['Product catalog shared', 'Price list sent', 'LinkedIn connection accepted', 'Call logged'].map((item, index) => <div key={item} className={`rounded-xl border p-4 ${index === 0 ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}><p className="font-bold text-slate-900">{item}</p><p className="mt-1 text-xs text-slate-500">Today · Recorded in the relationship timeline</p></div>)}</div></ShellCard></div>;
  }

  if (page.visual === 'catalog') {
    return <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{['Dry Fruits', 'Spices', 'Healthy Snacks', 'Dehydrated Products'].map((item, index) => <ShellCard key={item} className="overflow-hidden"><div className={`h-28 ${['bg-amber-100','bg-orange-100','bg-lime-100','bg-rose-100'][index]}`} /><div className="p-4"><p className="font-black text-slate-900">{item}</p><p className="mt-1 text-sm text-slate-500">12 products</p></div></ShellCard>)}</div><ShellCard className="p-5"><div className="flex items-center justify-between"><p className="font-black text-slate-950">Dubai Price List</p><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">USD</span></div><div className="mt-4 space-y-3">{['Almonds', 'Pistachios', 'Cashews', 'Walnuts'].map((item, index) => <div key={item} className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm"><span className="text-slate-600">{item}</span><span className="font-black text-slate-950">${(6.45 + index * 0.8).toFixed(2)}</span></div>)}</div><button className="mt-5 w-full rounded-xl bg-teal-700 py-3 text-sm font-bold text-white">Share Price List</button></ShellCard></div>;
  }

  if (page.visual === 'vcard') {
    return <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]"><div className="mx-auto w-full max-w-md rounded-[2rem] border border-teal-200 bg-white p-6 shadow-2xl"><div className="flex items-center gap-4"><Image src="/setu-guru/guru-avatar-128.png" alt="Profile" width={64} height={64} className="h-16 w-16 rounded-full" /><div><p className="text-xl font-black text-slate-950">Ritesh Kapoor</p><p className="text-sm text-slate-500">VP Sales & Operations</p><p className="text-sm font-bold text-teal-700">Setu Flow CRM</p></div></div><div className="mt-6 space-y-3 text-sm text-slate-600"><p>+91 510 123 4567</p><p>ritesh@setuflow.com</p><p>Dubai, UAE</p></div><div className="mt-6 flex gap-2"><button className="flex-1 rounded-xl bg-teal-700 py-3 text-sm font-bold text-white">Save Contact</button><button className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700">Share</button></div></div><ShellCard className="flex flex-col items-center justify-center p-6"><div className="grid h-44 w-44 grid-cols-9 gap-1 rounded-xl bg-white p-2 shadow-inner">{Array.from({ length: 81 }).map((_, index) => <span key={index} className={(index % 3 === 0 || index % 7 === 0) ? 'bg-slate-950' : 'bg-white'} />)}</div><p className="mt-4 font-black text-slate-950">Share your card</p><p className="mt-1 text-center text-sm text-slate-500">QR, WhatsApp, email, catalog, and price list.</p></ShellCard></div>;
  }

  if (page.visual === 'commercial') {
    return <ShellCard className="p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-slate-500">Quote Q-0305-117</p><p className="mt-2 text-4xl font-black text-slate-950">$125,430</p></div><div className="rounded-2xl bg-emerald-50 px-6 py-4 text-center"><p className="text-xs font-bold text-slate-500">Win probability</p><p className="mt-1 text-3xl font-black text-emerald-600">75%</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{[['12', 'Items'], ['22%', 'Margin'], ['25 May', 'Valid until']].map(([value, label]) => <ShellCard key={label} className="p-4"><p className="text-2xl font-black text-slate-950">{value}</p><p className="text-sm text-slate-500">{label}</p></ShellCard>)}</div><div className="mt-8 grid grid-cols-5 gap-2">{['Draft', 'Sent', 'Viewed', 'Revised', 'Approved'].map((item, index) => <div key={item} className="text-center"><span className={`mx-auto block h-5 w-5 rounded-full ${index < 4 ? 'bg-blue-600' : 'border-2 border-blue-600 bg-white'}`} /><p className="mt-2 text-xs font-bold text-slate-600">{item}</p></div>)}</div></ShellCard>;
  }

  if (page.visual === 'supplier') {
    return <ShellCard className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-2xl font-black text-slate-950">Elite Foods Pvt. Ltd.</p><p className="mt-1 text-sm font-bold text-emerald-600">Verified Supplier</p></div><span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Approved</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Category', 'Dehydrated Fruits'], ['Location', 'Maharashtra, India'], ['On-time Delivery', '96%'], ['Quality Score', '4.7/5']].map(([label, value]) => <ShellCard key={label} className="p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-2 font-black text-slate-900">{value}</p></ShellCard>)}</div></ShellCard>;
  }

  if (page.visual === 'orders') {
    return <ShellCard className="p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-slate-500">Order PO-6517</p><p className="mt-1 text-2xl font-black text-slate-950">Acme Imports Ltd.</p></div><span className="w-fit rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">In Transit</span></div><div className="mt-6 grid gap-3 sm:grid-cols-4">{[['15 Apr', 'Order date'], ['$125,430', 'Value'], ['25 Apr', 'ETA'], ['12', 'Items']].map(([value, label]) => <ShellCard key={label} className="p-4"><p className="text-xl font-black text-slate-950">{value}</p><p className="text-sm text-slate-500">{label}</p></ShellCard>)}</div><div className="mt-8 grid grid-cols-6 gap-2">{['Confirmed', 'Docs Ready', 'Packed', 'Shipped', 'In Transit', 'Delivered'].map((item, index) => <div key={item} className="text-center"><span className={`mx-auto block h-4 w-4 rounded-full ${index < 5 ? 'bg-teal-600' : 'border-2 border-teal-600 bg-white'}`} /><p className="mt-2 text-[11px] font-bold text-slate-600">{item}</p></div>)}</div></ShellCard>;
  }

  if (page.visual === 'analytics') {
    return <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{page.stat?.map(([value, label]) => <ShellCard key={label} className="p-4"><p className="text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></ShellCard>)}</div><ShellCard className="p-5"><p className="font-black text-slate-950">Revenue Trend</p><svg viewBox="0 0 520 220" className="mt-4 h-64 w-full"><line x1="0" y1="205" x2="520" y2="205" stroke="#e2e8f0" /><polyline fill="none" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" points="10,190 85,170 160,150 235,110 310,95 385,48 510,18" /></svg></ShellCard></div>;
  }

  if (page.visual === 'integrations') {
    const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-amber-500', 'bg-emerald-500', 'bg-slate-500'];
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{page.bullets.map((item, index) => <ShellCard key={item} className="flex min-h-36 flex-col items-center justify-center p-5"><div className={`h-14 w-14 rounded-2xl ${colors[index]}`} /><p className="mt-4 font-black text-slate-900">{item}</p></ShellCard>)}</div>;
  }

  return <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><div className="space-y-3">{page.bullets.map((item) => <ShellCard key={item} className="flex items-center gap-3 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 font-black text-emerald-600">✓</span><p className="font-bold text-slate-800">{item}</p></ShellCard>)}</div><ShellCard className="flex min-h-[360px] items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(45,212,191,.22),transparent_32%),linear-gradient(145deg,#f8fbff,#e8f4ff)] p-8"><div className="relative flex h-52 w-44 items-center justify-center rounded-[4rem_4rem_5rem_5rem] bg-gradient-to-b from-teal-400 to-[#0b1f4f] shadow-2xl"><span className="text-7xl text-white">🔒</span><span className="absolute -bottom-5 -right-10 rounded-2xl bg-[#0b1f4f] px-5 py-3 text-center text-xs font-black text-white">SOC 2<br />TYPE II</span></div></ShellCard></div>;
}

export function ProductOverviewExperience() {
  const [activeSlug, setActiveSlug] = useState('welcome');

  useEffect(() => {
    const readLocation = () => {
      const slug = new URLSearchParams(window.location.search).get('page');
      if (slug && pages.some((page) => page.slug === slug)) setActiveSlug(slug);
    };
    readLocation();
    window.addEventListener('popstate', readLocation);
    return () => window.removeEventListener('popstate', readLocation);
  }, []);

  const activeIndex = Math.max(0, pages.findIndex((page) => page.slug === activeSlug));
  const activePage = pages[activeIndex];
  const previous = pages[(activeIndex - 1 + pages.length) % pages.length];
  const next = pages[(activeIndex + 1) % pages.length];

  const progress = useMemo(() => Math.round(((activeIndex + 1) / pages.length) * 100), [activeIndex]);

  function selectPage(slug: string) {
    setActiveSlug(slug);
    const url = new URL(window.location.href);
    url.searchParams.set('page', slug);
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <SiteShell>
      <main className="min-h-screen bg-[#f6f9fc] text-slate-950">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Setu Flow CRM</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#0b1f4f]">Product Overview</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-48"><div className="mb-1 flex justify-between text-[11px] font-bold text-slate-500"><span>Page {activeIndex + 1} of {pages.length}</span><span>{progress}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} /></div></div>
              <Link href="/training" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#0b1f4f] hover:border-teal-200 hover:bg-teal-50">Open Academy</Link>
              <Link href="/book-demo" className="rounded-full bg-[#0b1f4f] px-4 py-2 text-sm font-bold text-white hover:bg-[#14336f]">Request Demo</Link>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:py-8">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_34px_rgba(15,23,42,.06)]">
              {pages.map((page, index) => {
                const active = page.slug === activeSlug;
                return <button key={page.slug} type="button" onClick={() => selectPage(page.slug)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-[#0b1f4f] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{String(index + 1).padStart(2, '0')}</span><span className="text-[13px] font-bold">{page.short}</span></button>;
              })}
            </div>
          </aside>

          <section>
            <div className="mb-4 lg:hidden">
              <label className="text-xs font-black uppercase tracking-[0.15em] text-slate-500" htmlFor="overview-page">Overview page</label>
              <select id="overview-page" value={activeSlug} onChange={(event) => selectPage(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm">
                {pages.map((page) => <option key={page.slug} value={page.slug}>{page.number}. {page.short}</option>)}
              </select>
            </div>

            <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.08)]">
              <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#ffffff,#f2fbfa)] px-5 py-6 sm:px-8 sm:py-8">
                <div className="flex items-start justify-between gap-5">
                  <div className="max-w-4xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#0b1f4f] px-3 py-1.5 text-xs font-black text-white"><span>{String(activePage.number).padStart(2, '0')}</span><span>{activePage.short}</span></div>
                    <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-[#0b1f4f] sm:text-5xl">{activePage.title}</h2>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{activePage.description}</p>
                  </div>
                  <div className="hidden items-center gap-3 sm:flex"><Image src="/logos/setu-flow-logo.png" alt="Setu Flow" width={130} height={42} className="h-10 w-auto" />{activePage.number % 3 === 1 ? <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={48} height={48} className="h-12 w-12 rounded-full" /> : null}</div>
                </div>
              </div>

              <div className="p-5 sm:p-8">
                <ProductVisual page={activePage} />
                {activePage.visual !== 'hero' && activePage.visual !== 'journey' && activePage.visual !== 'workspaces' ? <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{activePage.bullets.map((item) => <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">✓ {item}</div>)}</div> : null}
                {activePage.stat && activePage.visual !== 'analytics' ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{activePage.stat.map(([value, label]) => <ShellCard key={label} className="p-4 text-center"><p className="text-2xl font-black text-[#0b1f4f]">{value}</p><p className="mt-1 text-xs text-slate-500">{label}</p></ShellCard>)}</div> : null}
              </div>
            </article>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => selectPage(previous.slug)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50">← {previous.short}</button>
              <button type="button" onClick={() => selectPage(next.slug)} className="rounded-full bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-800">{next.short} →</button>
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
