export const MOBILE_APP_V1_FLAG = 'feature/mobile_app_v1';

export function isMobileAppV1Enabled() {
  const explicitPublic = process.env.NEXT_PUBLIC_FEATURE_MOBILE_APP_V1;
  const explicitServer = process.env.FEATURE_MOBILE_APP_V1;
  return explicitPublic !== 'false' && explicitServer !== 'false';
}
