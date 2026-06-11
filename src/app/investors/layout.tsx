import type { ReactNode } from 'react';

export default function InvestorsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        html {
          scroll-behavior: smooth;
          scroll-padding-top: 104px;
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
          background: linear-gradient(180deg, rgba(255, 248, 236, 0.42), rgba(255, 248, 236, 0.14)) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.34);
          box-shadow: 0 14px 46px rgba(31, 42, 29, 0.04);
          -webkit-backdrop-filter: blur(28px) saturate(155%);
          backdrop-filter: blur(28px) saturate(155%);
        }

        main > section:first-of-type > nav::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04), rgba(255,255,255,0.18));
          z-index: -1;
        }

        main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
          height: clamp(58px, 4.9vw, 82px) !important;
          width: auto !important;
          max-width: 190px !important;
          object-fit: contain !important;
          display: block !important;
        }

        main > section:first-of-type > nav > div:first-child {
          min-width: 290px;
        }

        main > section:first-of-type > nav + div + div,
        main > section:first-of-type > nav + div + div + div {
          isolation: isolate;
        }

        @media (max-width: 1280px) {
          main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
            height: clamp(52px, 4.4vw, 72px) !important;
            max-width: 170px !important;
          }
        }

        @media (max-width: 1024px) {
          main > section:first-of-type > nav > div:first-child {
            min-width: auto;
          }
        }

        @media (max-width: 640px) {
          html {
            scroll-padding-top: 86px;
          }

          main > section:first-of-type > nav img[src='/logos/setu-flow-lockup.svg'] {
            height: 46px !important;
            max-width: 132px !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
