import cron from 'node-cron';
import User from '../models/User.js';
import Club from '../models/Club.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import Settings from '../models/Settings.js';

// Pending subscriptions older than this are considered abandoned
const PENDING_TIMEOUT_HOURS = 2;

/**
 * Cancel stale pending subscriptions that were never paid.
 * A subscription is considered abandoned if it's been pending for over 2 hours
 * with no paymentDate or transactionId (i.e. payment was never completed).
 */
export const cancelStalePendingSubscriptions = async () => {
  const cutoff = new Date(Date.now() - PENDING_TIMEOUT_HOURS * 60 * 60 * 1000);

  const result = await MembershipSubscription.updateMany(
    {
      status: 'pending',
      createdAt: { $lt: cutoff },
      paymentDate: { $eq: null },
      transactionId: { $eq: null }
    },
    {
      $set: { status: 'cancelled', notes: `Auto-cancelled: no payment received within ${PENDING_TIMEOUT_HOURS} hours` }
    }
  );

  return result.modifiedCount || 0;
};

/**
 * Check and update membership/affiliation status for expired entities
 * Also calculates and adds arrears for unpaid memberships
 */
export const updateExpiredMemberships = async () => {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Running membership status update job...`);

    // Cancel stale pending subscriptions first
    const cancelledCount = await cancelStalePendingSubscriptions();
    if (cancelledCount > 0) {
      console.log(`  - Cancelled ${cancelledCount} stale pending subscription(s)`);
    }

    const settings = await Settings.getSettings();
    let playersUpdated = 0;
    let clubsUpdated = 0;
    let arrearsAdded = 0;

    // Find all expired players (membership expired and status still active)
    const expiredPlayers = await User.find({
      role: 'player',
      membershipStatus: 'active',
      membershipExpiry: { $lt: now }
    });

    for (const player of expiredPlayers) {
      // Calculate the fee they owe for the expired year
      const expiredYear = player.membershipExpiry.getFullYear();
      const feeOwed = player.isInternational
        ? settings.membershipFees.international
        : (player.membershipType === 'junior' ? settings.membershipFees.junior : settings.membershipFees.adult);

      // Check if this year's arrears already exist
      const existingArrear = player.arrears.find(a => a.year === expiredYear);

      if (!existingArrear) {
        // Add arrears for the expired year
        player.arrears.push({
          year: expiredYear,
          amount: feeOwed,
          membershipType: player.membershipType,
          addedOn: now
        });

        player.outstandingBalance = (player.outstandingBalance || 0) + feeOwed;
        arrearsAdded++;
      }

      // Update status
      player.membershipStatus = 'expired';
      await player.save();
      playersUpdated++;
    }

    // Find all expired clubs (affiliation expired and status still active)
    const expiredClubs = await Club.find({
      status: 'active',
      affiliationExpiry: { $lt: now }
    });

    for (const club of expiredClubs) {
      // Calculate the fee they owe for the expired year
      const expiredYear = club.affiliationExpiry.getFullYear();
      const feeOwed = settings.clubAffiliationFee || 0;

      // Check if this year's arrears already exist
      const existingArrear = club.arrears.find(a => a.year === expiredYear);

      if (!existingArrear && feeOwed > 0) {
        // Add arrears for the expired year
        club.arrears.push({
          year: expiredYear,
          amount: feeOwed,
          addedOn: now
        });

        club.outstandingBalance = (club.outstandingBalance || 0) + feeOwed;
        arrearsAdded++;
      }

      // Update status
      club.status = 'inactive';
      await club.save();
      clubsUpdated++;
    }

    console.log(`[${now.toISOString()}] Status update complete:`);
    console.log(`  - Players updated: ${playersUpdated}`);
    console.log(`  - Clubs updated: ${clubsUpdated}`);
    console.log(`  - Arrears added: ${arrearsAdded}`);

    return {
      success: true,
      playersUpdated,
      clubsUpdated,
      arrearsAdded,
      stalePendingCancelled: cancelledCount,
      timestamp: now
    };
  } catch (error) {
    console.error('Error updating membership status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initialize the cron job for automatic status updates
 */
export const initializeStatusUpdateJob = async () => {
  try {
    // Get settings to determine schedule
    const settings = await Settings.getSettings();
    const scheduleTime = settings.autoUpdateStatus.scheduleTime || '00:00';
    const enabled = settings.autoUpdateStatus.enabled !== false;

    if (!enabled) {
      console.log('Automatic status update job is disabled in settings');
      return null;
    }

    // Parse schedule time (format: "HH:MM")
    const [hour, minute] = scheduleTime.split(':');

    // Create cron expression: "minute hour * * *" (runs daily)
    const cronExpression = `${minute} ${hour} * * *`;

    console.log(`Scheduling membership status update job: ${cronExpression} (${scheduleTime} daily)`);

    // Schedule the job
    const job = cron.schedule(cronExpression, updateExpiredMemberships, {
      scheduled: true,
      timezone: 'Africa/Lusaka' // Zambia timezone
    });

    console.log('Membership status update job scheduled successfully');

    // Run stale pending cleanup every hour
    cron.schedule('0 * * * *', async () => {
      try {
        const cancelled = await cancelStalePendingSubscriptions();
        if (cancelled > 0) {
          console.log(`[${new Date().toISOString()}] Stale pending cleanup: cancelled ${cancelled} subscription(s)`);
        }
      } catch (err) {
        console.error('Stale pending cleanup error:', err);
      }
    }, { scheduled: true, timezone: 'Africa/Lusaka' });

    console.log('Stale pending subscription cleanup scheduled: every hour');

    return job;
  } catch (error) {
    console.error('Error initializing status update job:', error);
    return null;
  }
};

/**
 * Manual trigger for status update (for admin use or testing)
 */
export const manualStatusUpdate = async (req, res) => {
  try {
    const result = await updateExpiredMemberships();

    res.status(200).json({
      success: true,
      data: result,
      message: 'Membership status update completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
