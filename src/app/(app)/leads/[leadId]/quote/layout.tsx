import { Suspense } from 'react';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import QuoteDesignRequestLauncher from '@/features/packaging/components/quote-design-request-launcher';

export default async function QuoteLayout({ children, params }: { children: React.ReactNode; params: { leadId: string } }) {
  const workspace = await getWorkspaceAccess();
  const slug = String((workspace as any)?.organization?.slug ?? '').toLowerCase();
  const showStarkDesignHandoff = slug === 'starkpackmate';

  return (
    <>
      {showStarkDesignHandoff ? (
        <Suspense fallback={null}>
          <QuoteDesignRequestLauncher leadId={params.leadId} />
        </Suspense>
      ) : null}
      {children}
    </>
  );
}
