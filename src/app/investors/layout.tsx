import type { ReactNode } from 'react';

export default function InvestorsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 72px;
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
          padding-top: 0.35rem !important;
          padding-bottom: 0.35rem !important;
          background: linear-gradient(180deg, rgba(255, 248, 236, 0.24), rgba(255, 248, 236, 0.08)) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.26);
          box-shadow: 0 10px 30px rgba(31, 42, 29, 0.028);
          -webkit-backdrop-filter: blur(28px) saturate(155%);
          backdrop-filter: blur(28px) saturate(155%);
        }

        main > section:first-of-type > nav::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(255,255,255,0.13), rgba(255,255,255,0.02), rgba(255,255,255,0.13));
          z-index: -1;
        }

        main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
          height: clamp(38px, 3vw, 50px) !important;
          width: auto !important;
          max-width: 146px !important;
          object-fit: contain !important;
          display: block !important;
        }

        main > section:first-of-type > nav > div:first-child {
          min-width: 250px;
        }

        main > section:first-of-type > nav + div + div,
        main > section:first-of-type > nav + div + div + div {
          isolation: isolate;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] {
          width: min(36rem, calc(100vw - 3rem)) !important;
          max-width: 36rem !important;
          min-height: 10.9rem !important;
          padding: 1.05rem 1.15rem !important;
          border-radius: 1.65rem !important;
          background: linear-gradient(135deg, rgba(16, 38, 25, 0.48), rgba(31, 72, 124, 0.18), rgba(53, 159, 145, 0.08)) !important;
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          box-shadow: 0 22px 68px rgba(13, 39, 30, 0.14) !important;
          -webkit-backdrop-filter: blur(16px) saturate(124%);
          backdrop-filter: blur(16px) saturate(124%);
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:first-child {
          margin-bottom: 0.6rem !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] p {
          max-width: 31rem !important;
          margin-bottom: 0.85rem !important;
          color: rgba(255, 255, 255, 0.86) !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child > a:first-child {
          display: none !important;
        }

        main > section:first-of-type > div[class*='bottom-6'][class*='max-w-sm'] > div:last-child {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 0.6rem !important;
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
          justify-content: center !important;
          min-width: 0 !important;
          min-height: 2.05rem !important;
          border-radius: 999px !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          background: rgba(255, 255, 255, 0.095) !important;
          padding: 0.52rem 0.65rem !important;
          color: rgba(255, 255, 255, 0.92) !important;
          font-size: 0.7rem !important;
          font-weight: 750 !important;
          line-height: 1.05 !important;
          text-align: center !important;
          text-decoration: none !important;
          white-space: normal !important;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] {
          min-height: 10.9rem !important;
          border-color: transparent !important;
          padding: 0 !important;
          background: linear-gradient(135deg, rgba(16, 38, 25, 0.58), rgba(31, 72, 124, 0.24), rgba(53, 159, 145, 0.08)) !important;
          box-shadow: 0 24px 76px rgba(13, 39, 30, 0.18) !important;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] > div {
          min-height: 10.65rem !important;
          border-color: rgba(255, 255, 255, 0.06) !important;
          background: rgba(255, 255, 255, 0.045) !important;
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
            height: clamp(36px, 2.8vw, 46px) !important;
            max-width: 138px !important;
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
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          html {
            scroll-padding-top: 68px;
          }

          main > section:first-of-type > nav {
            padding-top: 0.35rem !important;
            padding-bottom: 0.35rem !important;
          }

          main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
            height: 36px !important;
            max-width: 110px !important;
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
