import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'event';
  noindex?: boolean;
}

const defaultMeta = {
  title: 'Zambia Tennis Association',
  description: 'Official website of the Zambia Tennis Association (ZTA). Find tennis tournaments, player rankings, clubs, coaching programs, and ZPIN registration. The home of tennis in Zambia.',
  keywords: 'Zambia Tennis, ZTA, Zambia Tennis Association, tennis Zambia, Lusaka tennis, tennis tournaments Zambia, tennis rankings Zambia, tennis clubs Zambia, ZPIN, tennis coaching Zambia',
  image: 'https://www.zambiatennis.com/zta-og-image.png',
  url: 'https://www.zambiatennis.com',
};

export function SEO({
  title,
  description = defaultMeta.description,
  keywords = defaultMeta.keywords,
  image = defaultMeta.image,
  url = defaultMeta.url,
  type = 'website',
  noindex = false,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | Zambia Tennis Association`
    : defaultMeta.title;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
}

// Pre-configured SEO for common pages
export const PageSEO = {
  Home: () => (
    <SEO
      title="Home"
      description="Official website of the Zambia Tennis Association. Find tennis tournaments, player rankings, clubs, coaching programs, and ZPIN registration. The home of tennis in Zambia."
      url="https://www.zambiatennis.com"
    />
  ),

  Tournaments: () => (
    <SEO
      title="Tennis Tournaments"
      description="View upcoming and past tennis tournaments in Zambia. Register for ZTA sanctioned tournaments, view draws, results, and tournament schedules."
      keywords="tennis tournaments Zambia, ZTA tournaments, Lusaka tennis tournament, junior tennis tournaments, tennis competition Zambia"
      url="https://www.zambiatennis.com/tournaments"
    />
  ),

  Rankings: () => (
    <SEO
      title="Player Rankings"
      description="Official Zambia Tennis Association player rankings. View current rankings for men's, women's, and junior categories. Track your ranking progress."
      keywords="tennis rankings Zambia, ZTA rankings, Zambian tennis players, tennis player rankings, junior tennis rankings Zambia"
      url="https://www.zambiatennis.com/rankings"
    />
  ),

  Players: () => (
    <SEO
      title="Registered Players"
      description="Browse registered tennis players in Zambia. Find players by name, club, or ZPIN. View player profiles and statistics."
      keywords="Zambian tennis players, registered players ZTA, ZPIN lookup, tennis players Lusaka, find tennis players"
      url="https://www.zambiatennis.com/players"
    />
  ),

  Clubs: () => (
    <SEO
      title="Tennis Clubs"
      description="Find tennis clubs in Zambia. View club locations, facilities, membership information, and contact details for ZTA affiliated clubs."
      keywords="tennis clubs Zambia, Lusaka tennis clubs, tennis courts Zambia, join tennis club, tennis facilities Zambia"
      url="https://www.zambiatennis.com/clubs"
    />
  ),

  Coaches: () => (
    <SEO
      title="Tennis Coaches"
      description="Find certified tennis coaches in Zambia. Browse coach profiles, qualifications, and contact information. Book tennis lessons with qualified instructors."
      keywords="tennis coaches Zambia, tennis lessons Zambia, tennis coaching Lusaka, tennis instructor, learn tennis Zambia, ITF certified coach"
      url="https://www.zambiatennis.com/coaches"
    />
  ),

  News: () => (
    <SEO
      title="Tennis News"
      description="Latest tennis news from Zambia. Stay updated with tournament results, player achievements, ZTA announcements, and tennis events in Zambia."
      keywords="tennis news Zambia, ZTA news, Zambian tennis updates, tennis results, tennis events Zambia"
      url="https://www.zambiatennis.com/news"
    />
  ),

  Juniors: () => (
    <SEO
      title="Junior Tennis"
      description="Junior tennis programs in Zambia. Information about youth development, junior tournaments, coaching programs, and opportunities for young tennis players."
      keywords="junior tennis Zambia, youth tennis, kids tennis Zambia, tennis for children, junior tennis development, young tennis players Zambia"
      url="https://www.zambiatennis.com/juniors"
    />
  ),

  Membership: () => (
    <SEO
      title="Membership & ZPIN"
      description="Join the Zambia Tennis Association. Get your ZPIN (Zambia Player Identification Number), register as a player, and access member benefits."
      keywords="ZPIN registration, ZTA membership, tennis membership Zambia, join ZTA, player registration Zambia"
      url="https://www.zambiatennis.com/membership"
    />
  ),

  About: () => (
    <SEO
      title="About ZTA"
      description="Learn about the Zambia Tennis Association, our mission, history, and executive committee. Discover how we're developing tennis across Zambia."
      keywords="about ZTA, Zambia Tennis Association history, ZTA executive, tennis governance Zambia, ITF member Zambia"
      url="https://www.zambiatennis.com/about"
    />
  ),

  Contact: () => (
    <SEO
      title="Contact Us"
      description="Contact the Zambia Tennis Association. Get in touch for inquiries about tournaments, membership, coaching, or general information."
      keywords="contact ZTA, Zambia Tennis Association contact, tennis inquiries Zambia, ZTA office"
      url="https://www.zambiatennis.com/contact"
    />
  ),

  Donate: () => (
    <SEO
      title="Support Tennis in Zambia"
      description="Support tennis development in Zambia. Donate to the Zambia Tennis Association and help grow the sport across the country."
      keywords="donate tennis Zambia, support ZTA, tennis charity, sponsor tennis Zambia, tennis development fund"
      url="https://www.zambiatennis.com/donate"
    />
  ),

  Gallery: () => (
    <SEO
      title="Photo Gallery"
      description="Photo gallery of tennis events in Zambia. View photos from tournaments, coaching clinics, and tennis activities across the country."
      keywords="tennis photos Zambia, tournament photos, tennis gallery, ZTA photos, tennis events pictures"
      url="https://www.zambiatennis.com/gallery"
    />
  ),

  Calendar: () => (
    <SEO
      title="Tennis Calendar"
      description="Zambia Tennis Association event calendar. View upcoming tournaments, coaching clinics, and tennis events scheduled throughout the year."
      keywords="tennis calendar Zambia, tournament schedule, tennis events 2024, ZTA calendar, upcoming tournaments"
      url="https://www.zambiatennis.com/calendar"
    />
  ),

  Leagues: () => (
    <SEO
      title="Tennis Leagues"
      description="Join tennis leagues in Zambia. View league standings, fixtures, and results. Participate in competitive team tennis across the country."
      keywords="tennis leagues Zambia, team tennis, league standings, tennis competition, club leagues"
      url="https://www.zambiatennis.com/leagues"
    />
  ),
};
