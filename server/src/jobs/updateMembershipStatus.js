import cron from 'node-cron';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Settings from '../models/Settings.js';

/**
 * Check and update membership/affiliation status for expired entities
 */
export const updateExpiredMemberships = async () => {
  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Running membership status update job...`);

    let playersUpdated = 0;
    let clubsUpdated = 0;

    // Update expired player memberships
    const expiredPlayers = await User.updateMany(
      {
        role: 'player',
        membershipStatus: 'active',
        membershipExpiry: { $lt: now }
      },
      {
        $set: { membershipStatus: 'expired' }
      }
    );

    playersUpdated = expiredPlayers.modifiedCount || 0;

    // Update expired club affiliations
    const expiredClubs = await Club.updateMany(
      {
        status: 'active',
        affiliationExpiry: { $lt: now }
      },
      {
        $set: { status: 'inactive' }
      }
    );

    clubsUpdated = expiredClubs.modifiedCount || 0;

    console.log(`[${now.toISOString()}] Status update complete:`);
    console.log(`  - Players updated: ${playersUpdated}`);
    console.log(`  - Clubs updated: ${clubsUpdated}`);

    return {
      success: true,
      playersUpdated,
      clubsUpdated,
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
