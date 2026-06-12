'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type CrmPhase = 'lead' | 'buyer' | 'quote' | 'docs' | 'readiness' | 'guru' | 'final';

type Props = {
  src: string;
  className?: string;
  showCrmOverlay?: boolean;
};

const workflow = [
  { key: 'lead', label: 'Lead' },
  { key: 'quote', label: 'Quote' },
  { key: 'docs', label: 'Docs' },
  { key: 'readiness', label: 'Approval' },
  { key: 'guru', label: 'Shipment' },
] as const;

function getPhase(progress: number, final: boolean): CrmPhase {
  if (final) return 'final';
  if (progress < 0.16) return 'lead';
  if (progress < 0.32) return 'buyer';
  if (progress < 0.5) return 'quote';
  if (progress < 0.66) return 'docs';
  if (progress < 0.82) return 'readiness';
  return 'guru';
}

function SetuGuruMark() {
  return (
    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-[0_18px_44px_rgba(31,72,124,0.28)] ring-1 ring-white/80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" className="h-full w-full object-contain" />
      <span className="absolute -right-1 -top-1 rounded-full bg-[#85AB8B] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white ring-2 ring-white">
        AI
      </span>
    </span>
  );
}

function CrmFeatureOverlay({ phase, reducedMotion }: { phase: CrmPhase; reducedMotion: boolean }) {
  const activeIndex = Math.max(0, workflow.findIndex((item) => item.key === phase));
  const final = phase === 'final';
  const pulse = reducedMotion ? '' : 'motion-safe:animate-[guruGlow_4s_ease-in-out_infinite]';

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      <style>{`
        @keyframes guruGlow { 0%,100% { box-shadow: 0 22px 70px rgba(13,39,30,0.22); } 50% { box-shadow: 0 30px 90px rgba(53,159,145,0.26); } }
      `}</style>
      <div className={`absolute bottom-[5.6rem] right-5 hidden w-[540px] rounded-[2rem] border border-white/50 bg-gradient-to-br from-[#102619]/82 via-[#17341f]/72 to-[#1F487C]/52 p-1 shadow-[0_22px_70px_rgba(13,39,30,0.24)] backdrop-blur-xl lg:block xl:right-10 ${pulse}`}>
        <div className="rounded-[1.72rem] border border-white/14 bg-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-4">
            <SetuGuruMark />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#DDEEDF]">
                    Setu Guru AI layer
                  </div>
                  <div className="mt-1 text-base font-semibold leading-tight text-white">
                    Assists every trade move, operator stays in control.
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-white/45 bg-white/90 px-3 py-1 text-[9px] font-black uppercase tracking-wide text-[#1F487C]">
                  Live CRM
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2.5">
                {workflow.map((item, index) => {
                  const active = final || index <= activeIndex;
                  return (
                    <div key={item.key} className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full transition-colors duration-500 ${
                          active ? 'bg-[#85AB8B]' : 'bg-white/35'
                        }`}
                      />
                      <span className={`text-xs font-bold ${active ? 'text-white' : 'text-white/62'}`}>
                        {item.label}
                      </span>
                      {index < workflow.length - 1 ? <span className="h-px w-5 bg-white/30" /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BoomerangVideoBg({ src, className, showCrmOverlay = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [framesReady, setFramesReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const framesRef = useRef<HTMLCanvasElement[]>([]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId = 0;
    const updateProgress = () => {
      if (video.duration && Number.isFinite(video.duration)) {
        setProgress(Math.min(1, Math.max(0, video.currentTime / video.duration)));
      }
      rafId = requestAnimationFrame(updateProgress);
    };
    rafId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafId);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const frames: HTMLCanvasElement[] = [];
    let capturing = true;
    let lastTime = -1;
    const MAX_WIDTH = 960;
    const MAX_FRAMES = 120;
    const MIN_CAPTURE_STEP = 1 / 20;

    const captureFrame = () => {
      if (!capturing || video.readyState < 2 || frames.length >= MAX_FRAMES) return;
      if (Math.abs(video.currentTime - lastTime) < MIN_CAPTURE_STEP) return;
      lastTime = video.currentTime;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const scale = Math.min(1, MAX_WIDTH / vw);
      const w = Math.round(vw * scale);
      const h = Math.round(vh * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      frames.push(canvas);
    };

    type VFCVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    const vfcVideo = video as VFCVideo;
    const hasVFC = typeof vfcVideo.requestVideoFrameCallback === 'function';

    let rafId = 0;
    const rafLoop = () => {
      captureFrame();
      if (capturing) rafId = requestAnimationFrame(rafLoop);
    };

    const vfcLoop = () => {
      captureFrame();
      if (capturing && vfcVideo.requestVideoFrameCallback) {
        vfcVideo.requestVideoFrameCallback(vfcLoop);
      }
    };

    const onEnded = () => {
      capturing = false;
      if (frames.length > 0) {
        framesRef.current = frames;
        setProgress(1);
        setFramesReady(true);
      }
    };

    const onLoaded = () => {
      video.play().catch(() => {});
      if (reducedMotion) return;
      if (hasVFC) {
        vfcVideo.requestVideoFrameCallback!(vfcLoop);
      } else {
        rafId = requestAnimationFrame(rafLoop);
      }
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('ended', onEnded);
    if (video.readyState >= 1) onLoaded();

    return () => {
      capturing = false;
      cancelAnimationFrame(rafId);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('ended', onEnded);
    };
  }, [src, reducedMotion]);

  useEffect(() => {
    if (!framesReady || reducedMotion) return;
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const frames = framesRef.current;
    if (frames.length === 0) return;

    const first = frames[0];
    canvas.width = first.width;
    canvas.height = first.height;

    let index = frames.length - 1;
    let last = performance.now();
    const interval = 1000 / 30;
    let rafId = 0;
    let done = false;

    ctx.drawImage(frames[index], 0, 0);

    const render = (now: number) => {
      if (now - last >= interval) {
        last = now;
        ctx.drawImage(frames[index], 0, 0);
        if (done) return;
        index -= 1;
        if (index <= 0) {
          index = 0;
          done = true;
        }
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [framesReady, reducedMotion]);

  const phase = useMemo(() => getPhase(progress, framesReady || reducedMotion), [progress, framesReady, reducedMotion]);

  return (
    <div className={className ?? 'absolute inset-0 w-full h-full'}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        style={{ display: framesReady && !reducedMotion ? 'none' : 'block' }}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />
      <canvas
        ref={displayCanvasRef}
        className="w-full h-full object-cover"
        style={{ display: framesReady && !reducedMotion ? 'block' : 'none' }}
      />
      {showCrmOverlay ? <CrmFeatureOverlay phase={phase} reducedMotion={reducedMotion} /> : null}
    </div>
  );
}
