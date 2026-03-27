import cron from 'node-cron';
import User from '../models/User.js';
import Club from '../models/Club.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import sendEmail from '../utils/sendEmail.js';

/**
 * Send membership expiry reminder emails to players and clubs.
 * Runs daily and sends reminders at 30, 14, and 7 days before expiry,
 * plus a "your membership has expired" notice the day after.
 */
export const sendExpiryReminders = async () => {
  const now = new Date();
  console.log(`[${now.toISOString()}] Running membership expiry reminder job...`);

  const frontendUrl = process.env.FRONTEND_URL || 'https://zambiatennis.co.zm';
  let sent = 0;
  let failed = 0;

  // Define reminder windows: [daysBeforeExpiry, emailSubjectTag]
  const reminderWindows = [
    { days: 30, tag: '30 days' },
    { days: 14, tag: '2 weeks' },
    { days: 7, tag: '7 days' },
    { days: 0, tag: 'today' },
  ];

  // --- Player reminders ---
  for (const window of reminderWindows) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + window.days);

    // Find players whose membership expires on the target date
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const players = await User.find({
      role: 'player',
      membershipStatus: 'active',
      membershipExpiry: { $gte: startOfDay, $lt: endOfDay },
      email: { $exists: true, $ne: null, $not: /noemail/ }
    });

    for (const player of players) {
      try {
        const isToday = window.days === 0;
        await sendEmail({
          email: player.email,
          subject: isToday
            ? 'Your ZTA Membership Expires Today'
            : `ZTA Membership Expires in ${window.tag}`,
          html: buildPlayerReminderEmail(player, window, frontendUrl)
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${player.email}:`, err.message);
        failed++;
      }
    }
  }

  // --- Expired player notice (expired yesterday) ---
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  const endOfYesterday = new Date(startOfYesterday);
  endOfYesterday.setDate(endOfYesterday.getDate() + 1);

  const expiredPlayers = await User.find({
    role: 'player',
    membershipStatus: { $in: ['active', 'expired'] },
    membershipExpiry: { $gte: startOfYesterday, $lt: endOfYesterday },
    email: { $exists: true, $ne: null, $not: /noemail/ }
  });

  for (const player of expiredPlayers) {
    try {
      await sendEmail({
        email: player.email,
        subject: 'Your ZTA Membership Has Expired',
        html: buildPlayerExpiredEmail(player, frontendUrl)
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send expired notice to ${player.email}:`, err.message);
      failed++;
    }
  }

  // --- Club affiliation reminders ---
  for (const window of reminderWindows) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + window.days);

    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const clubs = await Club.find({
      status: 'active',
      affiliationExpiry: { $gte: startOfDay, $lt: endOfDay },
      email: { $exists: true, $ne: null }
    });

    for (const club of clubs) {
      try {
        const isToday = window.days === 0;
        await sendEmail({
          email: club.email,
          subject: isToday
            ? 'Your Club Affiliation Expires Today'
            : `Club Affiliation Expires in ${window.tag}`,
          html: buildClubReminderEmail(club, window, frontendUrl)
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send reminder to club ${club.name}:`, err.message);
        failed++;
      }
    }
  }

  // --- Expired club notice ---
  const expiredClubs = await Club.find({
    status: { $in: ['active', 'inactive'] },
    affiliationExpiry: { $gte: startOfYesterday, $lt: endOfYesterday },
    email: { $exists: true, $ne: null }
  });

  for (const club of expiredClubs) {
    try {
      await sendEmail({
        email: club.email,
        subject: 'Your Club Affiliation Has Expired',
        html: buildClubExpiredEmail(club, frontendUrl)
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send expired notice to club ${club.name}:`, err.message);
      failed++;
    }
  }

  console.log(`[${now.toISOString()}] Reminder job complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
};

// --- Email templates ---

function buildPlayerReminderEmail(player, window, frontendUrl) {
  const isToday = window.days === 0;
  const urgency = isToday
    ? 'expires today'
    : `will expire in <strong>${window.tag}</strong>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Membership Renewal Reminder</h2>
      <p>Hi ${player.firstName},</p>
      <p>Your Zambia Tennis Association membership ${urgency} (${formatDate(player.membershipExpiry)}).</p>
      ${player.zpin ? `<p>Your ZPIN: <strong>${player.zpin}</strong></p>` : ''}
      <p>To continue enjoying ZTA benefits — including tournament eligibility, rankings, and league participation — please renew your membership before it expires.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/membership/pay"
           style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Renew Membership
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">If you have already renewed, please disregard this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Zambia Tennis Association | <a href="${frontendUrl}" style="color: #16a34a;">zambiatennis.co.zm</a></p>
    </div>
  `;
}

function buildPlayerExpiredEmail(player, frontendUrl) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Membership Expired</h2>
      <p>Hi ${player.firstName},</p>
      <p>Your Zambia Tennis Association membership expired on <strong>${formatDate(player.membershipExpiry)}</strong>.</p>
      ${player.zpin ? `<p>Your ZPIN: <strong>${player.zpin}</strong></p>` : ''}
      <p>Without an active membership, you will not be eligible for:</p>
      <ul>
        <li>Tournament entry</li>
        <li>League participation</li>
        <li>Official ZTA rankings</li>
      </ul>
      <p>Renew now to restore your membership and avoid any interruption.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/membership/pay"
           style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Renew Now
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Zambia Tennis Association | <a href="${frontendUrl}" style="color: #16a34a;">zambiatennis.co.zm</a></p>
    </div>
  `;
}

function buildClubReminderEmail(club, window, frontendUrl) {
  const isToday = window.days === 0;
  const urgency = isToday
    ? 'expires today'
    : `will expire in <strong>${window.tag}</strong>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Club Affiliation Renewal Reminder</h2>
      <p>Dear ${club.name},</p>
      <p>Your Zambia Tennis Association club affiliation ${urgency} (${formatDate(club.affiliationExpiry)}).</p>
      <p>To maintain your club's active status and ensure your members can participate in ZTA events, please renew your affiliation.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/club-affiliation"
           style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Renew Affiliation
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">If you have already renewed, please disregard this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Zambia Tennis Association | <a href="${frontendUrl}" style="color: #16a34a;">zambiatennis.co.zm</a></p>
    </div>
  `;
}

function buildClubExpiredEmail(club, frontendUrl) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Club Affiliation Expired</h2>
      <p>Dear ${club.name},</p>
      <p>Your Zambia Tennis Association club affiliation expired on <strong>${formatDate(club.affiliationExpiry)}</strong>.</p>
      <p>Your club's status has been set to inactive. This means your members may not be eligible for ZTA-sanctioned events until the affiliation is renewed.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/club-affiliation"
           style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Renew Now
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Zambia Tennis Association | <a href="${frontendUrl}" style="color: #16a34a;">zambiatennis.co.zm</a></p>
    </div>
  `;
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Initialize the reminder cron job.
 * Runs daily at 8:00 AM Zambia time.
 */
export const initializeReminderJob = () => {
  const job = cron.schedule('0 8 * * *', async () => {
    try {
      await sendExpiryReminders();
    } catch (err) {
      console.error('Membership reminder job error:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Lusaka'
  });

  console.log('Membership expiry reminder job scheduled: 08:00 daily (Africa/Lusaka)');
  return job;
};
