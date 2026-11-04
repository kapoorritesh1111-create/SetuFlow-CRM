'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getEnabledModuleSet, type ModuleKey, type OrgModuleGrant } from '@/lib/modules/module-grants';

type GrantsPayload = {
  grants?: OrgModuleGrant[];
  canAccessAdmin?: boolean;
  organizationId?: string;
};

type MobilePermissionState = {
  grants: OrgModuleGrant[];
  enabled: ReadonlySet<ModuleKey>;
  canAccessAdmin: boolean;
  loaded: boolean;
  error: boolean;
  refresh: () => void;
};

const MobilePermissionsContext = createContext<MobilePermissionState | null>(null);

// One live entitlement snapshot for the entire mobile shell. A momentary network
// failure must not silently turn a licensed workspace into an empty application.
export function MobilePermissionsProvider({
  children,
  organizationId,
}: {
  children: ReactNode;
  organizationId: string;
}) {
  const [grants, setGrants] = useState<OrgModuleGrant[]>([]);
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => setRefreshCounter((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch('/api/modules/grants', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Mobile workspace permissions unavailable');
        return response.json() as Promise<GrantsPayload>;
      })
      .then((payload) => {
        if (!active) return;
        if (payload.organizationId !== organizationId || !Array.isArray(payload.grants)) {
          throw new Error('Mobile workspace organization did not match session');
        }
        setGrants(payload.grants);
        setCanAccessAdmin(payload.canAccessAdmin === true);
        setLoaded(true);
        setError(false);
      })
      .catch(() => {
        if (!active) return;
        setLoaded(true);
        setError(true);
        // Preserve a previously verified snapshot for this *same* organization
        // during a network outage; server permissions still gate every action.
      });
    return () => { active = false; controller.abort(); };
  }, [organizationId, refreshCounter]);

  useEffect(() => {
    const whenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', whenVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', whenVisible);
    };
  }, [refresh]);

  const enabled = useMemo(() => getEnabledModuleSet(grants), [grants]);
  const value = useMemo(() => ({
    grants, enabled, canAccessAdmin, loaded, error, refresh,
  }), [grants, enabled, canAccessAdmin, loaded, error, refresh]);

  return (
    <MobilePermissionsContext.Provider value={value}>
      {children}
    </MobilePermissionsContext.Provider>
  );
}

export function useMobilePermissions(): MobilePermissionState {
  const value = useContext(MobilePermissionsContext);
  if (!value) throw new Error('useMobilePermissions requires MobilePermissionsProvider');
  return value;
}
