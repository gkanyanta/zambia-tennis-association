import User from '../models/User.js';
import Club from '../models/Club.js';

/**
 * Activate membership for an entity (player, club, coach) after successful payment.
 * Sets membershipStatus to 'active' and optionally sets validUntil (Dec 31 current year).
 *
 * @param {string} entityType - 'player', 'club', or 'coach'
 * @param {string} entityId - The entity's ObjectId
 * @param {string} paymentId - The payment record ID (optional)
 * @param {Object} options - Additional options
 * @param {Date} options.validUntil - Optional expiry date (defaults to Dec 31 current year)
 * @returns {Object} - Updated entity
 */
export async function activateMembership(entityType, entityId, paymentId = null, options = {}) {
  const validUntil = options.validUntil || new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

  if (entityType === 'player' || entityType === 'coach') {
    const update = {
      membershipStatus: 'active',
      membershipExpiry: validUntil
    };
    if (paymentId) {
      update.lastPaymentId = paymentId;
      update.lastPaymentDate = new Date();
    }

    const user = await User.findByIdAndUpdate(entityId, update, { new: true });
    return user;
  }

  if (entityType === 'club') {
    const update = {
      status: 'active',
      affiliationExpiry: validUntil
    };
    if (paymentId) {
      update.lastPaymentId = paymentId;
      update.lastPaymentDate = new Date();
    }

    const club = await Club.findByIdAndUpdate(entityId, update, { new: true });
    return club;
  }

  throw new Error(`Unknown entity type: ${entityType}`);
}

/**
 * Deactivate membership for an entity.
 * Called by cron job or manually when membership expires.
 */
export async function deactivateMembership(entityType, entityId) {
  if (entityType === 'player' || entityType === 'coach') {
    return User.findByIdAndUpdate(entityId, { membershipStatus: 'expired' }, { new: true });
  }

  if (entityType === 'club') {
    return Club.findByIdAndUpdate(entityId, { status: 'inactive' }, { new: true });
  }

  throw new Error(`Unknown entity type: ${entityType}`);
}
