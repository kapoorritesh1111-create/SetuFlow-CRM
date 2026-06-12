'use client';

import { ReactNode, SVGProps, useEffect, useRef, useState } from 'react';
import BoomerangVideoBg from './boomerang-video-bg';

const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4';

const INVEST_EMAIL = 'invest@setugroups.com';
const INVEST_MAILTO = `mailto:${INVEST_EMAIL}?subject=SetuFlow%20Pre-Seed%20%E2%80%94%20Deck%20Request`;

const HEADING_FONT = {
  fontFamily:
    '"Neue Haas Grotesk Display Pro 55 Roman", "Neue Haas Grotesk Text Pro", "Helvetica Neue", Helvetica, Arial, sans-serif',
  letterSpacing: '-0.035em',
} as const;

function iconProps(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

const MailIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const SparklesIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
  </svg>
);

const MenuIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </svg>
);

const XIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const GlobeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const TrendingUpIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <path d="M16 7h6v6" />
    <path d="m22 7-8.5 8.5-5-5L2 17" />
  </svg>
);

const TargetIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const TruckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
);

const FileSearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...iconProps(p)}>
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" />
    <circle cx="5" cy="14" r="3" />
    <path d="m9 18-1.5-1.5" />
  </svg>
);

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const heroUsps = ['Lead Capture', 'Document Readiness', 'Risk Signal', 'Operator Control'];

const problemCards = [
  {
    title: '80% still run on Excel + WhatsApp',
    body: 'Business cards from trade shows entered days later. Follow-ups forgotten. Deals go cold silently — with no record of what happened.',
  },
  {
    title: 'Compliance blockers kill shipments',
    body: 'A lapsed certificate discovered at port delays an order two weeks. No system flagged it. The buyer relationship absorbs the damage.',
  },
  {
    title: "Generic CRMs don't understand trade",
    body: 'HubSpot has no freight calculator. Zoho has no FOB/CIF basis logic. Neither has HS-code fields, compliance checklists, or approval gates.',
  },
  {
    title: 'Enterprise tools are out of reach',
    body: 'SAP GTM and Oracle TM exist — but cost $50,000+ to implement with six months of consultants. The SMB exporter is priced out entirely.',
  },
  {
    title: 'Every wrong quote costs margin',
    body: 'FX-rate errors, wrong freight estimates, unapproved discounts — without a governed system, these happen on every deal. No audit trail.',
  },
];

const tractionStats = [
  { value: '5', label: 'Paying clients' },
  { value: '<50', label: 'Active users' },
  { value: '<$200', label: 'CAC · founder-led' },
  { value: '10+', label: 'Modules shipped' },
  { value: '<5 days', label: 'Time to value' },
  { value: '100%', label: 'Actions audit-logged' },
];

const liveCountries = [
  { flag: '🇮🇳', name: 'India' },
  { flag: '🇦🇪', name: 'UAE' },
  { flag: '🇮🇪', name: 'Ireland' },
  { flag: '🇬🇧', name: 'United Kingdom' },
  { flag: '🇩🇪', name: 'Germany' },
  { flag: '🇺🇸', name: 'United States' },
];

const marketStats = [
  { value: '$2.8B', label: 'Trade management software market today' },
  { value: '$5.7B', label: 'Market by 2032 · 10.6% CAGR' },
  { value: '250k+', label: 'SMB trading companies with zero purpose-built software' },
  { value: '$1T', label: "India's exports-by-2030 mission" },
];

const compCols = ['Excel + WhatsApp', 'HubSpot / Zoho', 'SAP / E2open', 'Setu Flow'];
const compRows = [
  { cap: 'FOB/CIF pricing + auto freight calc', cells: ['no', 'no', '~ ERP', 'yes'] },
  { cap: 'Live FX rate locked at quote time', cells: ['no', 'no', '~ Treasury', 'yes'] },
  { cap: 'WhatsApp quote delivery', cells: ['no', 'no', 'no', 'yes'] },
  { cap: 'Stage Move Readiness (9-point gate)', cells: ['no', 'no', 'no', 'yes'] },
  { cap: 'Mobile-native app purpose-built for trade', cells: ['no', 'no', 'no', 'yes'] },
  { cap: 'Business-card OCR → lead in 30s', cells: ['no', '~', 'no', 'yes'] },
  { cap: 'Country compliance by destination', cells: ['no', 'no', '~ Enterprise', 'yes'] },
  { cap: 'AI priority + risk + delay scoring', cells: ['no', 'no', 'no', 'yes'] },
  { cap: 'Time to value · 20-person team', cells: ['Never', '2–4 weeks', '3–6 months · $50k', '<5 days · no fee'] },
];

const mlRoadmap = [
  {
    icon: TrendingUpIcon,
    title: 'Quote Intelligence',
    body: 'Win-probability and margin-safe price suggestions per market, learned from versioned quote history, FX locks, and approval outcomes already captured in the platform.',
  },
  {
    icon: TargetIcon,
    title: 'Predictive Lead Scoring',
    body: 'Upgrades the shipped rule-based lead health to learned conversion scoring from event source, response latency, and buyer-interaction signals.',
  },
  {
    icon: TruckIcon,
    title: 'Dispatch Risk Prediction',
    body: 'Predicts order delays and shipment blockers from document readiness, compliance-gate history, and the 9-point Stage Move Readiness data on every deal.',
  },
  {
    icon: FileSearchIcon,
    title: 'Document Intelligence',
    body: 'OCR-driven extraction, certificate-expiry forecasting, and missing-document detection per destination country — before a lapsed certificate delays an order at port.',
  },
];

const pricingTiers = [
  {
    name: 'Starter',
    price: '$199',
    cadence: '/mo · up to 5 users',
    note: '1–5 person export desks · India tier-2 cities · GCC SMBs',
    features: ['Pipeline + lead management', 'Quote builder', 'vCard + QR + OCR capture', 'Mobile app', 'Up to 3 trade events / year'],
    featured: false,
  },
  {
    name: 'Growth',
    price: '$499',
    cadence: '/mo · up to 10 users',
    note: 'Primary revenue tier · 50–200 person trading companies',
    features: ['Everything in Starter', 'AI Assist', 'WhatsApp quote delivery', 'Compliance + document workspace', 'Product catalog + market pricing'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: 'multi-team · dedicated support',
    note: 'Custom workflows · approval thresholds',
    features: ['Everything in Growth', 'Unlimited users + custom roles', 'ERP integrations', 'Dedicated onboarding + SLA', 'Approval threshold customization'],
    featured: false,
  },
];

const useOfFunds = [
  { pct: 45, label: 'ML capabilities', detail: 'The four-model roadmap above, on data we already capture' },
  { pct: 25, label: 'Sales funnel', detail: 'Trade shows · WhatsApp-first outreach · inbound content' },
  { pct: 20, label: 'Engineering uplifts', detail: 'Platform scaling · API integrations · mobile + PWA hardening' },
  { pct: 10, label: 'Operations', detail: 'Legal · finance · runway discipline' },
];

const milestones = [
  {
    period: 'Mo 1–3',
    phase: 'Launch — India wedge',
    gtm: 'India launch + 15 paying clients + first 2 channel partners',
    product: 'Lead capture, quote workflow, document readiness, and Setu Guru signals hardened for repeatable onboarding',
    value: 'Prove <5 day time-to-value and repeatable founder-led conversion from trade-event leads',
  },
  {
    period: 'Mo 4–6',
    phase: 'Scale — repeatable acquisition',
    gtm: '35 paying clients + first EU customers',
    product: 'AI quote/risk models live across quote risk, margin protection, and lead prioritization',
    value: 'Show measurable quote speed, win-rate lift, and reduced margin leakage for SMB exporters',
  },
  {
    period: 'Mo 7–9',
    phase: 'Expand — EU/GCC pipeline',
    gtm: '75 paying clients + partner-led pipeline in EU/GCC',
    product: 'Document intelligence beta and destination compliance workflows live for priority corridors',
    value: 'Reduce document misses, shipment blockers, and compliance surprises before ops handoff',
  },
  {
    period: 'Mo 10–12',
    phase: 'Seed-ready — category wedge',
    gtm: '120–150 paying clients + $1M ARR run-rate path',
    product: 'Seed-ready GTM engine, ERP integration foundations, and investor-grade cohort reporting',
    value: 'Demonstrate retention, expansion path, and AI-assisted trade execution metrics for Seed raise',
  },
];

function LockupLogo({ className = 'h-9 sm:h-10 w-auto' }: { className?: string }) {
  return <img src="/logos/setu-flow-lockup.svg" alt="Setu Flow" className={className} draggable={false} />;
}

function CompCell({ value, isSetu }: { value: string; isSetu: boolean }) {
  if (value === 'yes') {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isSetu ? 'bg-[#85AB8B]/20 text-[#85AB8B]' : 'bg-white/10 text-white/70'}`}>
        <CheckIcon className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (value === 'no') return <XIcon className="w-4 h-4 text-white/25 mx-auto" />;
  return <span className={`text-xs ${isSetu ? 'text-[#85AB8B] font-medium' : 'text-white/55'}`}>{value}</span>;
}

function SectionHeading({ eyebrow, title, accent, body, dark = false }: { eyebrow: string; title: string; accent: string; body?: string; dark?: boolean }) {
  return (
    <Reveal>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#85AB8B] mb-4">{eyebrow}</p>
      <h2 className={`${dark ? 'text-white' : 'text-[#336443]'} font-normal leading-[1.0] text-3xl sm:text-4xl md:text-5xl max-w-3xl`} style={HEADING_FONT}>
        {title} <span className="text-[#85AB8B]">{accent}</span>
      </h2>
      {body ? <p className={`mt-5 ${dark ? 'text-white/75' : 'text-[#4b5b47]'} text-sm sm:text-base leading-relaxed max-w-2xl`}>{body}</p> : null}
    </Reveal>
  );
}

export function InvestorOverviewPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navLinks = [
    { href: '#problem', label: 'The Problem' },
    { href: '#market', label: 'Market' },
    { href: '#traction', label: 'Traction' },
    { href: '#round', label: 'The Round' },
  ];

  return (
    <main className="bg-white" style={{ WebkitFontSmoothing: 'antialiased' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://db.onlinewebfonts.com/c/6e47ef470dd19698c911332a9b4d1cf4?family=Neue+Haas+Grotesk+Text+Pro" rel="stylesheet" />
      <link href="https://db.onlinewebfonts.com/c/dec0d9b4e22ca588dc20e1e2e09a59b5?family=Neue+Haas+Grotesk+Display+Pro+55+Roman" rel="stylesheet" />

      <section className="relative w-full min-h-screen sm:h-screen overflow-hidden">
        <BoomerangVideoBg src={BG_VIDEO} className="absolute inset-0 w-full h-full" />
        <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-6">
          <div className="flex items-center gap-3 text-[#2d3a2a]">
            <a href="/" aria-label="Setu Flow home" className="inline-flex items-center"><LockupLogo /></a>
            <span className="hidden md:inline-block text-[11px] font-semibold uppercase tracking-wider text-[#3d5638] bg-white/70 backdrop-blur-md border border-white/60 rounded-full px-3 py-1">Investor Overview</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-white/70 backdrop-blur-md rounded-full pl-6 pr-1 py-1 shadow-sm border border-white/60">
            {navLinks.map((link, i) => (
              <a key={link.href} href={link.href} className={`text-sm px-3 py-2 transition-colors ${i === 0 ? 'font-semibold text-[#1f2a1d]' : 'font-medium text-[#4b5b47] hover:text-[#1f2a1d]'}`}>{link.label}</a>
            ))}
            <a href={INVEST_MAILTO} className="ml-2 bg-[#1f2a1d] hover:bg-[#2a3827] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors">Request the Deck</a>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 text-[#2d3a2a]">
            <a href="https://www.setuflowcrm.com" target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"><GlobeIcon className="w-4 h-4" />Product Site</a>
            <a href={INVEST_MAILTO} className="hidden sm:flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"><MailIcon className="w-4 h-4" />{INVEST_EMAIL}</a>
            <button onClick={() => setMenuOpen((v) => !v)} className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-[#1f2a1d]" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
              {menuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        <div className={`lg:hidden fixed inset-0 z-20 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-[#1f2a1d]/40 backdrop-blur-sm" />
        </div>
        <div className={`lg:hidden fixed top-0 right-0 bottom-0 z-20 w-[85%] max-w-sm bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-500 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full pt-24 px-8 pb-8">
            {navLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="text-2xl font-semibold text-[#1f2a1d] py-4 border-b border-[#1f2a1d]/10">{link.label}</a>)}
            <a href={INVEST_MAILTO} className="mt-8 bg-[#1f2a1d] text-white text-sm font-semibold px-5 py-3 rounded-full text-center">Request the Deck</a>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center pt-24 sm:pt-28 md:pt-32 px-4 sm:px-6">
          <h1 className="font-normal leading-[0.95] text-[#336443] text-[2rem] sm:text-4xl md:text-5xl lg:text-[4.75rem] xl:text-[5.25rem] max-w-5xl" style={HEADING_FONT}>
            The missing operating layer <span className="text-[#85AB8B]">for the $10T<br className="hidden sm:block" /> trade economy</span>
          </h1>
          <p className="mt-6 sm:mt-8 text-[#4b5b47] text-sm sm:text-base md:text-lg leading-relaxed max-w-md px-2">
            Setu Flow is the trade execution CRM for the 250,000+ SMB import-export teams stuck between Excel and SAP. Live product. Paying clients. Now raising.
          </p>
        </div>

        <div className="investor-hero-proof-card absolute left-4 right-4 sm:right-auto sm:left-6 md:left-10 bottom-6 sm:bottom-8 md:bottom-10 z-10 max-w-sm">
          <div className="flex items-center gap-2 text-white/95 mb-3">
            <SparklesIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Pre-Seed · $250K–$500K</span>
          </div>
          <p className="text-white/85 text-xs leading-relaxed mb-6 max-w-xs font-normal">
            5 paying clients. CAC under $200. 10+ shipped modules. Raising to scale the sales funnel and ship ML on the trade data we already capture.
          </p>
          <div className="investor-hero-usp-row grid grid-cols-2 sm:grid-cols-4 gap-2">
            {heroUsps.map((usp) => <span key={usp} className="investor-hero-usp-pill">{usp}</span>)}
          </div>
        </div>
      </section>

      <section id="problem" className="bg-white py-20 sm:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="The Problem" title="250,000+ trading companies." accent="Zero purpose-built software." />
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {problemCards.map((card, i) => (
              <Reveal key={card.title} delay={i * 70}>
                <div className="rounded-2xl border border-[#1f2a1d]/10 bg-[#f6f7f4] p-6 sm:p-8 h-full border-l-4 border-l-[#1f2a1d]">
                  <h3 className="text-base sm:text-lg font-semibold text-[#1f2a1d]">{card.title}</h3>
                  <p className="mt-2 text-sm text-[#4b5b47] leading-relaxed">{card.body}</p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={problemCards.length * 70}>
              <div className="rounded-2xl bg-[#1f2a1d] p-6 sm:p-8 h-full">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#85AB8B] mb-3">The Gap</p>
                <p className="text-sm text-white/85 leading-relaxed">Between $0 Excel and $50,000 SAP, there is nothing purpose-built for the 250,000+ SMB trading company. That is the gap Setu Flow is built to own.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="market" className="bg-[#f6f7f4] py-20 sm:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Market · Why Now" title="$2.8B today. $5.7B by 2032." accent="No dominant player for SMB traders." body="Post-COVID digitization is only half-done, India's $1T export mission needs faster quoting, and assistive AI with operator approval is finally enterprise-safe." />
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {marketStats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="rounded-2xl bg-white border border-[#1f2a1d]/10 p-6 sm:p-8 h-full transition-shadow hover:shadow-md">
                  <div className="text-3xl sm:text-4xl text-[#336443]" style={HEADING_FONT}>{stat.value}</div>
                  <div className="mt-2 text-xs sm:text-sm font-medium text-[#4b5b47]">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="competitive" className="bg-[#1f2a1d] py-20 sm:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading dark eyebrow="Competitive Landscape" title="Generic CRMs sell pipelines." accent="Trade teams need execution." />
          <Reveal delay={120}>
            <div className="mt-10 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-white/50 uppercase tracking-wider py-4 pr-4 align-bottom">Capability</th>
                    {compCols.map((col, i) => <th key={col} className={`py-4 px-3 text-center text-xs font-semibold align-bottom ${i === compCols.length - 1 ? 'text-[#85AB8B] bg-[#85AB8B]/10 rounded-t-xl' : 'text-white/60'}`}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {compRows.map((row) => (
                    <tr key={row.cap} className="border-t border-white/10">
                      <td className="py-3.5 pr-4 text-sm text-white/85">{row.cap}</td>
                      {row.cells.map((cell, i) => <td key={i} className={`py-3.5 px-3 text-center ${i === row.cells.length - 1 ? 'bg-[#85AB8B]/10' : ''}`}><CompCell value={cell} isSetu={i === row.cells.length - 1} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="traction" className="bg-white py-20 sm:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Traction" title="Live numbers," accent="not projections." body="Every client below was won founder-led, at trade events, with no paid acquisition — the most capital-efficient validation an early trade-software company can show." />
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {tractionStats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="rounded-2xl border border-[#1f2a1d]/10 bg-[#f6f7f4] p-6 sm:p-8 h-full transition-shadow hover:shadow-md">
                  <div className="text-3xl sm:text-4xl md:text-5xl text-[#336443]" style={HEADING_FONT}>{stat.value}</div>
                  <div className="mt-2 text-xs sm:text-sm font-medium text-[#4b5b47]">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={160}>
            <div className="mt-10 rounded-2xl border border-[#1f2a1d]/10 bg-[#f6f7f4] p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5"><GlobeIcon className="w-4 h-4 text-[#336443]" /><span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3d5638]">Clients &amp; active pilots across</span></div>
              <div className="flex flex-wrap gap-3">{liveCountries.map((c) => <span key={c.name} className="inline-flex items-center gap-2 rounded-full bg-white border border-[#1f2a1d]/10 px-4 py-2 text-sm font-medium text-[#1f2a1d]"><span className="text-base leading-none">{c.flag}</span>{c.name}</span>)}</div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="roadmap" className="bg-[#f6f7f4] py-20 sm:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="ML Roadmap" title="The data is already captured." accent="Now it learns." body="100% of actions in Setu Flow are audit-logged — quotes, approvals, document states, and stage gates. This raise ships four models on top of that governed event stream." />
          <div className="mt-12 grid sm:grid-cols-2 gap-4 sm:gap-6">
            {mlRoadmap.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="rounded-2xl border border-[#1f2a1d]/10 bg-white p-6 sm:p-8 h-full transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#336443]/10 text-[#336443] mb-4"><item.icon className="w-5 h-5" /></div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[#1f2a1d]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#4b5b47] leading-relaxed">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="model" className="bg-white py-20 sm:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading eyebrow="Business Model" title="SaaS subscription. No implementation fee." accent="High gross margin." />
          <div className="mt-12 grid md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
            {pricingTiers.map((tier, i) => (
              <Reveal key={tier.name} delay={i * 90}>
                <div className={`rounded-2xl p-6 sm:p-8 h-full border ${tier.featured ? 'bg-[#1f2a1d] border-[#1f2a1d] text-white shadow-lg' : 'bg-[#f6f7f4] border-[#1f2a1d]/10 text-[#1f2a1d]'}`}>
                  <div className="flex items-center justify-between"><h3 className={`text-xl font-semibold ${tier.featured ? 'text-white' : 'text-[#1f2a1d]'}`}>{tier.name}</h3>{tier.featured ? <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#85AB8B] text-[#1f2a1d] rounded-full px-2.5 py-1">Most Popular</span> : null}</div>
                  <div className={`mt-4 text-4xl ${tier.featured ? 'text-[#85AB8B]' : 'text-[#336443]'}`} style={HEADING_FONT}>{tier.price}</div>
                  <div className={`mt-1 text-xs ${tier.featured ? 'text-white/60' : 'text-[#4b5b47]'}`}>{tier.cadence}</div>
                  <div className={`mt-4 text-xs leading-relaxed pb-4 mb-4 border-b ${tier.featured ? 'text-white/70 border-white/15' : 'text-[#4b5b47] border-[#1f2a1d]/10'}`}>{tier.note}</div>
                  <ul className="flex flex-col gap-3">{tier.features.map((f) => <li key={f} className="flex items-start gap-2.5"><CheckIcon className={`w-4 h-4 mt-0.5 shrink-0 ${tier.featured ? 'text-[#85AB8B]' : 'text-[#336443]'}`} /><span className={`text-sm ${tier.featured ? 'text-white/85' : 'text-[#4b5b47]'}`}>{f}</span></li>)}</ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="round" className="bg-[#1f2a1d] py-20 sm:py-28 px-4 sm:px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <SectionHeading dark eyebrow="The Round" title="Pre-Seed ·" accent="$250K–$500K" body="Twelve months of execution: scale founder-led traction into a repeatable sales funnel, and convert the platform's governed trade data into the ML capabilities above." />
          <div className="mt-12 flex flex-col gap-14">
            <Reveal delay={80}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60 mb-6">Use of funds</h3>
              <div className="grid sm:grid-cols-2 gap-x-12 gap-y-7">
                {useOfFunds.map((item) => <div key={item.label}><div className="flex items-baseline justify-between mb-2"><span className="text-sm font-semibold text-white">{item.label}</span><span className="text-2xl text-[#85AB8B]" style={HEADING_FONT}>{item.pct}%</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#85AB8B]" style={{ width: `${item.pct}%` }} /></div><p className="mt-2 text-xs text-white/60">{item.detail}</p></div>)}
              </div>
            </Reveal>

            <Reveal delay={160}>
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/60 mb-6">Twelve-month milestones</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                {milestones.map((m) => (
                  <div key={m.period} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 h-full">
                    <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                      <span className="text-sm font-semibold text-[#85AB8B]">{m.period}</span>
                      <span className="text-sm font-semibold text-white text-right">{m.phase}</span>
                    </div>
                    <div className="space-y-3">
                      {[['GTM', m.gtm], ['Product', m.product], ['Value', m.value]].map(([label, text]) => (
                        <div key={label} className="grid grid-cols-[4.5rem_1fr] gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#85AB8B]/80">{label}</span>
                          <span className="text-sm text-white/82 leading-relaxed">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={240}>
            <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <a href={INVEST_MAILTO} className="bg-white hover:bg-white/90 text-[#1f2a1d] text-sm font-semibold px-7 py-3.5 rounded-full transition-colors shadow-sm inline-flex items-center gap-2"><MailIcon className="w-4 h-4" />Request the Deck &amp; Data Room</a>
              <span className="text-white/60 text-sm">{INVEST_EMAIL} · full materials for accredited investors</span>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="bg-[#1f2a1d] border-t border-white/10 px-4 sm:px-6 md:px-10 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <img src="/logos/setu-flow-lockup-white.svg" alt="Setu Flow" className="h-10 w-auto opacity-90" draggable={false} />
          <div className="flex items-center gap-6 text-xs text-white/50"><a href="https://www.setuflowcrm.com" target="_blank" rel="noreferrer" className="hover:text-white/80 transition-colors">setuflowcrm.com</a><a href={INVEST_MAILTO} className="hover:text-white/80 transition-colors">{INVEST_EMAIL}</a></div>
          <span className="text-[11px] text-white/40">Confidential — for accredited investors only · June 2026</span>
        </div>
      </footer>
    </main>
  );
}

export default InvestorOverviewPage;
