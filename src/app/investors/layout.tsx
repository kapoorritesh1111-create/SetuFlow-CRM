import type { ReactNode } from 'react';

export default function InvestorsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 64px;
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
          padding-top: 0.18rem !important;
          padding-bottom: 0.18rem !important;
          background: linear-gradient(180deg, rgba(255, 248, 236, 0.2), rgba(255, 248, 236, 0.06)) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 8px 24px rgba(31, 42, 29, 0.025);
          -webkit-backdrop-filter: blur(28px) saturate(155%);
          backdrop-filter: blur(28px) saturate(155%);
        }

        main > section:first-of-type > nav::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.015), rgba(255,255,255,0.1));
          z-index: -1;
        }

        main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
          height: clamp(32px, 2.6vw, 42px) !important;
          width: auto !important;
          max-width: 128px !important;
          object-fit: contain !important;
          display: block !important;
        }

        main > section:first-of-type > nav > div:first-child {
          min-width: 230px;
        }

        main > section:first-of-type > nav + div + div,
        main > section:first-of-type > nav + div + div + div {
          isolation: isolate;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] {
          width: min(38rem, calc(100vw - 3rem)) !important;
          max-width: 38rem !important;
          min-height: 9.55rem !important;
          padding: 1rem 1.12rem !important;
          border-radius: 1.65rem !important;
          background: linear-gradient(135deg, rgba(16, 38, 25, 0.34), rgba(31, 72, 124, 0.12), rgba(53, 159, 145, 0.05)) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 20px 58px rgba(13, 39, 30, 0.12) !important;
          -webkit-backdrop-filter: blur(15px) saturate(120%);
          backdrop-filter: blur(15px) saturate(120%);
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:first-child {
          margin-bottom: 0.55rem !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] p {
          max-width: 34rem !important;
          margin-bottom: 0.75rem !important;
          color: rgba(255, 255, 255, 0.86) !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 0.55rem !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child::before {
          content: 'Lead Capture';
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child::after {
          content: 'Operator Control';
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child::before,
        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child::after,
        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:first-child,
        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:last-child {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 0 !important;
          min-height: 1.95rem !important;
          border-radius: 999px !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          background: rgba(255, 255, 255, 0.085) !important;
          padding: 0.46rem 0.5rem !important;
          color: rgba(255, 255, 255, 0.92) !important;
          font-size: 0.58rem !important;
          font-weight: 750 !important;
          line-height: 1.05 !important;
          text-align: center !important;
          text-decoration: none !important;
          white-space: normal !important;
          box-shadow: none !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:first-child,
        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:last-child {
          font-size: 0 !important;
          color: transparent !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:first-child::before {
          content: 'Document Readiness';
          color: rgba(255, 255, 255, 0.92) !important;
          font-size: 0.58rem !important;
          font-weight: 750 !important;
          line-height: 1.05 !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:last-child::before {
          content: 'Risk Signal';
          color: rgba(255, 255, 255, 0.92) !important;
          font-size: 0.58rem !important;
          font-weight: 750 !important;
          line-height: 1.05 !important;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] {
          width: min(38rem, calc(100vw - 3rem)) !important;
          min-height: 9.55rem !important;
          bottom: 2.5rem !important;
          border-color: transparent !important;
          padding: 0 !important;
          background: linear-gradient(135deg, rgba(16, 38, 25, 0.36), rgba(31, 72, 124, 0.14), rgba(53, 159, 145, 0.05)) !important;
          box-shadow: 0 22px 66px rgba(13, 39, 30, 0.15) !important;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] > div {
          min-height: 9.3rem !important;
          border-color: rgba(255, 255, 255, 0.045) !important;
          background: rgba(255, 255, 255, 0.035) !important;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] div[class*='grid-cols-3'] {
          display: none !important;
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
            height: clamp(30px, 2.4vw, 38px) !important;
            max-width: 120px !important;
          }
        }

        @media (max-width: 1024px) {
          main > section:first-of-type > nav > div:first-child {
            min-width: auto;
          }

          main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] {
            width: min(24rem, calc(100vw - 2rem)) !important;
            min-height: auto !important;
          }

          main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 640px) {
          html {
            scroll-padding-top: 58px;
          }

          main > section:first-of-type > nav {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }

          main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
            height: 32px !important;
            max-width: 98px !important;
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
