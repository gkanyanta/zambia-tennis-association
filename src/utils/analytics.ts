// Google Analytics utility functions
// Configure GA_TRACKING_ID in your environment variables

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA_TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID || '';

// Track page views
export const pageview = (url: string, title?: string) => {
  if (!GA_TRACKING_ID || typeof window === 'undefined' || !window.gtag) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
    page_title: title,
  });
};

// Track custom events
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (!GA_TRACKING_ID || typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track tournament registrations
export const trackTournamentRegistration = (tournamentName: string, amount?: number) => {
  event({
    action: 'tournament_registration',
    category: 'Tournaments',
    label: tournamentName,
    value: amount,
  });
};

// Track ZPIN payments
export const trackZPINPayment = (playerCount: number, amount: number) => {
  event({
    action: 'zpin_payment',
    category: 'Membership',
    label: `${playerCount} player(s)`,
    value: amount,
  });
};

// Track club affiliation payments
export const trackClubAffiliation = (clubName: string, amount: number) => {
  event({
    action: 'club_affiliation',
    category: 'Membership',
    label: clubName,
    value: amount,
  });
};

// Track donations
export const trackDonation = (donationType: string, amount: number) => {
  event({
    action: 'donation',
    category: 'Donations',
    label: donationType,
    value: amount,
  });
};

// Track search queries
export const trackSearch = (searchQuery: string, resultsCount?: number) => {
  event({
    action: 'search',
    category: 'Search',
    label: searchQuery,
    value: resultsCount,
  });
};

// Track external link clicks
export const trackExternalLink = (url: string) => {
  event({
    action: 'external_link_click',
    category: 'Outbound',
    label: url,
  });
};

// Track file downloads
export const trackDownload = (fileName: string) => {
  event({
    action: 'download',
    category: 'Downloads',
    label: fileName,
  });
};
