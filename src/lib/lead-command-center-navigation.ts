export type LeadCommandCenterNavigator = {
  push: (href: string) => void;
};

function normalizeBrowserPath(href: string) {
  if (typeof window === 'undefined') return href;
  const url = new URL(href, window.location.origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function navigateToLeadCommandCenter(router: LeadCommandCenterNavigator, href: string) {
  if (typeof window === 'undefined') return;

  const targetPath = normalizeBrowserPath(href);
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath === targetPath) return;

  router.push(href);

  window.setTimeout(() => {
    const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextPath !== targetPath) {
      window.location.assign(new URL(href, window.location.origin).toString());
    }
  }, 150);
}
