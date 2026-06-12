import type { ReactNode } from 'react';

export default function InvestorsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 88px;
        }

        #problem,
        #market,
        #traction,
        #round,
        #competitive,
        #roadmap,
        #model {
          scroll-margin-top: 0;
        }

        main > section:first-of-type > nav {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 60 !important;
          padding-top: 0.65rem !important;
          padding-bottom: 0.65rem !important;
          background: linear-gradient(180deg, rgba(255, 248, 236, 0.34), rgba(255, 248, 236, 0.1)) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 12px 38px rgba(31, 42, 29, 0.035);
          -webkit-backdrop-filter: blur(30px) saturate(160%);
          backdrop-filter: blur(30px) saturate(160%);
        }

        main > section:first-of-type > nav::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.035), rgba(255,255,255,0.18));
          z-index: -1;
        }

        main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
          height: clamp(50px, 4vw, 66px) !important;
          width: auto !important;
          max-width: 176px !important;
          object-fit: contain !important;
          display: block !important;
        }

        main > section:first-of-type > nav > div:first-child {
          min-width: 270px;
        }

        main > section:first-of-type > nav + div + div,
        main > section:first-of-type > nav + div + div + div {
          isolation: isolate;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] {
          max-width: 22rem !important;
          padding: 1rem 1.15rem !important;
          border-radius: 1.65rem !important;
          background: linear-gradient(135deg, rgba(16, 38, 25, 0.68), rgba(31, 72, 124, 0.26)) !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          box-shadow: 0 22px 68px rgba(13, 39, 30, 0.18) !important;
          -webkit-backdrop-filter: blur(18px) saturate(132%);
          backdrop-filter: blur(18px) saturate(132%);
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:first-child {
          margin-bottom: 0.55rem !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] p {
          margin-bottom: 0.75rem !important;
          color: rgba(255, 255, 255, 0.84) !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:first-child {
          display: none !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child {
          gap: 0.75rem !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child::before {
          content: 'Live product';
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child::after {
          content: 'AI-assisted execution';
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child::before,
        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child::after,
        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:last-child {
          display: inline-flex !important;
          align-items: center !important;
          min-height: 1.9rem !important;
          border-radius: 999px !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          background: rgba(255, 255, 255, 0.1) !important;
          padding: 0.48rem 0.72rem !important;
          color: rgba(255, 255, 255, 0.92) !important;
          font-size: 0.68rem !important;
          font-weight: 700 !important;
          line-height: 1 !important;
          text-decoration: none !important;
          white-space: nowrap !important;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] {
          border-color: transparent !important;
          padding: 0 !important;
          background: linear-gradient(135deg, rgba(16, 38, 25, 0.8), rgba(31, 72, 124, 0.38), rgba(53, 159, 145, 0.16)) !important;
          box-shadow: 0 24px 76px rgba(13, 39, 30, 0.26) !important;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] > div {
          border-color: rgba(255, 255, 255, 0.08) !important;
          background: rgba(255, 255, 255, 0.055) !important;
        }

        main > footer > div > span:first-child {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 156px;
          height: 58px;
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.95);
          color: transparent !important;
          overflow: hidden;
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        main > footer > div > span:first-child sup {
          display: none;
        }

        main > footer > div > span:first-child::before {
          content: '';
          width: 132px;
          height: 46px;
          background-image: url('/logos/setu-flow-lockup.svg');
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
        }

        @media (max-width: 1280px) {
          main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
            height: clamp(46px, 3.8vw, 60px) !important;
            max-width: 162px !important;
          }
        }

        @media (max-width: 1024px) {
          main > section:first-of-type > nav > div:first-child {
            min-width: auto;
          }
        }

        @media (max-width: 640px) {
          html {
            scroll-padding-top: 78px;
          }

          main > section:first-of-type > nav {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }

          main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
            height: 42px !important;
            max-width: 124px !important;
          }

          main > footer > div > span:first-child {
            width: 136px;
            height: 52px;
          }

          main > footer > div > span:first-child::before {
            width: 116px;
            height: 40px;
          }
        }
      `}</style>
      {children}
    </>
  );
}
