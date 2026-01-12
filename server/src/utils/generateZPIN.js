import User from '../models/User.js';

/**
 * Generate next ZPIN based on membership type
 * Format: ZTAJ#### for juniors, ZTAS#### for seniors
 * @param {string} membershipType - 'junior', 'adult', or 'family'
 * @returns {Promise<string>} Generated ZPIN
 */
export const generateNextZPIN = async (membershipType) => {
  try {
    // Determine prefix based on membership type
    const prefix = membershipType === 'junior' ? 'ZTAJ' : 'ZTAS';

    // Find the highest existing ZPIN with this prefix
    const lastPlayer = await User.findOne({
      zpin: { $regex: `^${prefix}` }
    })
    .sort({ zpin: -1 })
    .limit(1);

    let nextNumber = 1;

    if (lastPlayer && lastPlayer.zpin) {
      // Extract the number from the last ZPIN (e.g., ZTAJ0150 -> 150)
      const lastNumber = parseInt(lastPlayer.zpin.substring(4));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format with leading zeros (4 digits)
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `${prefix}${paddedNumber}`;

  } catch (error) {
    console.error('Error generating ZPIN:', error);
    throw new Error('Failed to generate ZPIN');
  }
};

/**
 * Check if ZPIN already exists
 * @param {string} zpin - ZPIN to check
 * @param {string} excludeUserId - User ID to exclude (for updates)
 * @returns {Promise<boolean>} True if ZPIN exists
 */
export const zpinExists = async (zpin, excludeUserId = null) => {
  if (!zpin) return false;

  const query = { zpin };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existing = await User.findOne(query);
  return !!existing;
};
