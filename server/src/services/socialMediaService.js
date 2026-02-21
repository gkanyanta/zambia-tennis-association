/**
 * Social Media Service - Event-driven posting for live match events
 *
 * Controlled by SOCIAL_MEDIA_ENABLED env var.
 * Supports X/Twitter (via twitter-api-v2) and Facebook (via Graph API).
 *
 * Required env vars (when enabled):
 * - SOCIAL_MEDIA_ENABLED=true
 * - TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 * - FACEBOOK_PAGE_TOKEN
 */

const ENABLED = process.env.SOCIAL_MEDIA_ENABLED === 'true';

// Message templates
const templates = {
  matchStarted: (data) =>
    `🎾 LIVE: ${data.player1} vs ${data.player2}\n` +
    `${data.tournamentName} - ${data.categoryName} ${data.roundName}\n` +
    `${data.court ? `Court ${data.court}` : ''}\n` +
    `#ZambiaTennis #ZTA`,

  setCompleted: (data) =>
    `🎾 Set ${data.setNumber} complete!\n` +
    `${data.player1} vs ${data.player2}: ${data.scoreString}\n` +
    `${data.tournamentName} - ${data.categoryName}\n` +
    `#ZambiaTennis`,

  matchCompleted: (data) =>
    `🏆 ${data.winner} wins!\n` +
    `${data.player1} vs ${data.player2}: ${data.scoreString}\n` +
    `${data.tournamentName} - ${data.categoryName} ${data.roundName}\n` +
    `#ZambiaTennis #ZTA`
};

/**
 * Post to X/Twitter
 */
async function postToTwitter(message) {
  try {
    // Dynamic import to avoid requiring the package when not in use
    const { TwitterApi } = await import('twitter-api-v2');

    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET
    });

    await client.v2.tweet(message);
    console.log('Posted to Twitter successfully');
  } catch (error) {
    console.error('Twitter post failed:', error.message);
  }
}

/**
 * Post to Facebook Page
 */
async function postToFacebook(message) {
  try {
    const pageToken = process.env.FACEBOOK_PAGE_TOKEN;
    if (!pageToken) return;

    const response = await fetch(
      `https://graph.facebook.com/me/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          access_token: pageToken
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
    }

    console.log('Posted to Facebook successfully');
  } catch (error) {
    console.error('Facebook post failed:', error.message);
  }
}

/**
 * Post a match event to all enabled social media platforms
 * @param {'matchStarted'|'setCompleted'|'matchCompleted'} eventType
 * @param {Object} data - Event data for template rendering
 */
export async function postMatchEvent(eventType, data) {
  if (!ENABLED) return;

  const template = templates[eventType];
  if (!template) {
    console.warn(`Unknown social media event type: ${eventType}`);
    return;
  }

  const message = template(data);

  // Post to all platforms in parallel
  const promises = [];

  if (process.env.TWITTER_API_KEY) {
    promises.push(postToTwitter(message));
  }

  if (process.env.FACEBOOK_PAGE_TOKEN) {
    promises.push(postToFacebook(message));
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}
