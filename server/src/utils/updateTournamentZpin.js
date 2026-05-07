import Tournament from '../models/Tournament.js';

const ACTIVE_STATUSES = ['upcoming', 'entries_open', 'entries_closed', 'in_progress'];

export const updateTournamentEntryZpinStatus = async (playerId) => {
  try {
    const pid = playerId.toString();
    await Tournament.updateMany(
      { status: { $in: ACTIVE_STATUSES }, 'categories.entries.playerId': pid },
      { $set: { 'categories.$[].entries.$[e].zpinPaidUp': true } },
      { arrayFilters: [{ 'e.playerId': pid, 'e.zpinPaidUp': false }] }
    );
    await Tournament.updateMany(
      { status: { $in: ACTIVE_STATUSES }, 'categories.entries.partnerId': pid },
      { $set: { 'categories.$[].entries.$[e].partnerZpinPaidUp': true } },
      { arrayFilters: [{ 'e.partnerId': pid, 'e.partnerZpinPaidUp': false }] }
    );
  } catch (err) {
    console.error(`updateTournamentEntryZpinStatus failed for player ${playerId}:`, err.message);
  }
};
