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

        .investor-hero-proof-card {
          width: min(38rem, calc(100vw - 3rem));
          max-width: 38rem !important;
          min-height: 9.55rem;
          padding: 1rem 1.12rem;
          border-radius: 1.65rem;
          background: linear-gradient(135deg, rgba(16, 38, 25, 0.36), rgba(31, 72, 124, 0.14), rgba(53, 159, 145, 0.05));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 58px rgba(13, 39, 30, 0.12);
          -webkit-backdrop-filter: blur(15px) saturate(120%);
          backdrop-filter: blur(15px) saturate(120%);
        }

        .investor-hero-proof-card p {
          max-width: 34rem !important;
          margin-bottom: 0.75rem !important;
          color: rgba(255, 255, 255, 0.86) !important;
        }

        .investor-hero-usp-row {
          width: 100%;
        }

        .investor-hero-usp-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          min-height: 1.95rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.085);
          padding: 0.46rem 0.5rem;
          color: rgba(255, 255, 255, 0.92);
          font-size: 0.58rem;
          font-weight: 750;
          line-height: 1.05;
          text-align: center;
          white-space: normal;
          box-shadow: none;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] {
          width: min(38rem, calc(100vw - 3rem)) !important;
          min-height: 9.55rem !important;
          bottom: 2.5rem !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          padding: 0 !important;
          background: linear-gradient(135deg, rgba(16, 38, 25, 0.36), rgba(31, 72, 124, 0.14), rgba(53, 159, 145, 0.05)) !important;
          box-shadow: 0 22px 66px rgba(13, 39, 30, 0.15) !important;
        }

        main > section:first-of-type > div:first-child div[class*='bg-gradient-to-br'][class*='bottom-'] > div {
          min-height: 9.3rem !important;
          border-color: rgba(255, 255, 255, 0.045) !important;
          background: rgba(255, 255, 255, 0.035) !important;
          display: flex !important;
          align-items: center !important;
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

          .investor-hero-proof-card {
            width: min(24rem, calc(100vw - 2rem));
            min-height: auto;
          }

          .investor-hero-usp-row {
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
