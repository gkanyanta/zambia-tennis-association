import cron from 'node-cron';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Settings from '../models/Settings.js';

/**
 * Check and update membership/affiliation status for expired entities
 * Also calculates and adds arrears for unpaid memberships
 */
export const updateExpiredMemberships = async () => {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Running membership status update job...`);

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
