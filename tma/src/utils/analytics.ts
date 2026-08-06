// Privacy-friendly funnel tracking (Plausible, no cookies/PII). Script is
// wired in index.html with a queue shim, so track() is safe to call even
// before plausible.io/js/script.js has finished loading.
//
// Event names are the funnel checkpoints agreed for the 6 августа release:
// where a user can drop off before reaching a goal (connect wallet -> create
// zone/subdomain -> confirm tx), so gaps show up directly in Plausible Events.

type AnalyticsProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: AnalyticsProps }) => void;
  }
}

export const track = (eventName: string, props?: AnalyticsProps): void => {
  try {
    window.plausible?.(eventName, props ? { props } : undefined);
  } catch (error) {
    console.warn('[analytics] track failed:', eventName, error);
  }
};

// Never pass wallet addresses, tx hashes, user IDs or other PII as props —
// only action types/statuses/short reasons (see Log.md 2026-08-06 privacy note).
export const trackTxFailed = (action: string, reason: string): void => {
  track('tx_failed', { action, reason: reason.slice(0, 120) });
};
