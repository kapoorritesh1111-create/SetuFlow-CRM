'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { StateMessage } from '@/components/ui/state-message';
import { getEnabledModuleSet, getModuleForPath, isPathEnabled, type ModuleKey, type OrgModuleGrant } from '@/lib/modules/module-grants';

type GrantsResponse = {
  grants?: OrgModuleGrant[];
  enabledModules?: ModuleKey[];
};

export function ModuleAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [grants, setGrants] = useState<OrgModuleGrant[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/modules/grants', { cache: 'no-store' })
      .then((response) => response.json() as Promise<GrantsResponse>)
      .then((payload) => {
        if (!active) return;
        if (payload.grants?.length) {
          setGrants(payload.grants);
          return;
        }
        if (payload.enabledModules?.length) {
          setGrants(payload.enabledModules.map((moduleKey) => ({ module_key: moduleKey, enabled: true })));
          return;
        }
        setGrants([]);
      })
      .catch(() => {
        if (active) setGrants([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const enabledModules = useMemo(() => getEnabledModuleSet(grants), [grants]);
  const moduleDef = getModuleForPath(pathname);

  if (grants && moduleDef && !isPathEnabled(pathname, enabledModules)) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-10">
        <StateMessage
          title="Access not enabled"
          description={`${moduleDef.title} is disabled for this organization. Ask an owner or admin to enable the module from Admin > Modules.`}
          tone="warning"
        />
      </div>
    );
  }

  return <>{children}</>;
}
