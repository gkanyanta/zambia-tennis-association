import Tournament from '../models/Tournament.js';
import User from '../models/User.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import { iterDrawMatches } from '../utils/iterDrawMatches.js';

const lockedPlayerMatchesResponse = (playerId) => ({
  playerId,
  hasActiveSubscription: false,
  totalMatches: 0,
  wins: 0,
  losses: 0,
  winPercentage: 0,
  matches: [],
  headToHead: [],
});

/**
 * Walk-in players (created via the manual draw feature) have synthetic ids
 * starting with "walkin-". They are not tracked users and cannot be looked
 * up for further H2H drill-through.
 */
const isWalkinId = (id) => typeof id === 'string' && id.startsWith('walkin-');

const isDoublesFormat = (fmt) => fmt === 'doubles' || fmt === 'mixed_doubles';

/**
 * Build a lookup of playerId -> their partner for a category, derived from
 * the entries collection (which is where partner pairing actually lives).
 * Matches themselves only store one player per "side", so we have to join
 * back to entries to render both names of a doubles pair.
 */
const buildPartnerMap = (category) => {
  const map = new Map();
  if (!isDoublesFormat(category?.format)) return map;
  for (const entry of category.entries || []) {
    const a = entry.playerId ? String(entry.playerId) : null;
    const b = entry.partnerId ? String(entry.partnerId) : null;
    if (a && b) {
      if (!map.has(a)) map.set(a, { id: b, name: entry.partnerName || null });
      if (!map.has(b)) map.set(b, { id: a, name: entry.playerName || null });
    }
  }
  return map;
};

/**
 * Iterate every completed, player-identified match in a tournament.
 * Yields { category, match, stage, partnerMap } so doubles partners can be
 * resolved at projection time.
 */
function* iterCompletedMatches(tournament) {
  for (const category of tournament.categories || []) {
    const partnerMap = buildPartnerMap(category);
    for (const { match, stage } of iterDrawMatches(category.draw)) {
      if (!match || match.status !== 'completed') continue;
      if (!match.winner || !match.player1?.id || !match.player2?.id) continue;
      yield { category, match, stage, partnerMap };
    }
  }
}

/** Project a raw match into the shape served to clients. */
const projectMatch = (tournament, category, match, stage, playerId, partnerMap) => {
  const isP1 = match.player1.id === playerId;
  const self = isP1 ? match.player1 : match.player2;
  const opponent = isP1 ? match.player2 : match.player1;
  const won = match.winner === playerId;
  const selfPartner = partnerMap?.get(String(self.id)) || null;
  const oppPartner = partnerMap?.get(String(opponent.id)) || null;
  return {
    tournamentId: tournament._id,
    tournamentName: tournament.name,
    tournamentStart: tournament.startDate,
    tournamentEnd: tournament.endDate,
    categoryId: category._id,
    categoryName: category.name,
    categoryFormat: category.format,
    matchId: match._id,
    round: match.round,
    roundName: match.roundName,
    stage,
    playerName: self.name,
    partnerId: selfPartner?.id || null,
    partnerName: selfPartner?.name || null,
    opponent: {
      id: opponent.id,
      name: opponent.name,
      isWalkin: isWalkinId(opponent.id),
      partnerId: oppPartner?.id || null,
      partnerName: oppPartner?.name || null,
    },
    score: match.score || '',
    won,
    completedTime: match.completedTime || null,
  };
};

// @desc    Get every completed match a player has played, plus a H2H
//          summary row per distinct opponent.
// @route   GET /api/players/:playerId/matches
// @access  Public (tournament results are public)
export const getPlayerMatches = async (req, res) => {
  try {
    const { playerId } = req.params;
    if (!playerId || isWalkinId(playerId)) {
      return res.status(400).json({ success: false, message: 'A registered player id is required' });
    }

    const hasActiveSubscription = await MembershipSubscription.hasActiveSubscription(playerId, 'player');
    if (!hasActiveSubscription) {
      return res.status(200).json({
        success: true,
        data: lockedPlayerMatchesResponse(playerId),
      });
    }

    const tournaments = await Tournament.find(
      {},
      'name startDate endDate categories'
    ).lean();

    const matches = [];
    for (const t of tournaments) {
      for (const { category, match, stage, partnerMap } of iterCompletedMatches(t)) {
        if (match.player1.id !== playerId && match.player2.id !== playerId) continue;
        matches.push(projectMatch(t, category, match, stage, playerId, partnerMap));
      }
    }

    // Sort newest first (completedTime, fall back to tournamentEnd)
    matches.sort((a, b) => {
      const ad = new Date(a.completedTime || a.tournamentEnd || 0).getTime();
      const bd = new Date(b.completedTime || b.tournamentEnd || 0).getTime();
      return bd - ad;
    });

    const wins = matches.filter((m) => m.won).length;
    const losses = matches.length - wins;

    // Per-opponent H2H summary. Doubles partner of the most recent match
    // is preserved on the summary so the UI can show the pair "X / Y".
    const byOpponent = new Map();
    for (const m of matches) {
      const key = m.opponent.id || `walkin::${m.opponent.name}`;
      let rec = byOpponent.get(key);
      if (!rec) {
        rec = {
          opponentId: m.opponent.id,
          opponentName: m.opponent.name,
          opponentPartnerName: m.opponent.partnerName || null,
          isWalkin: m.opponent.isWalkin,
          isDoubles: isDoublesFormat(m.categoryFormat),
          played: 0,
          wins: 0,
          losses: 0,
          lastPlayed: null,
        };
        byOpponent.set(key, rec);
      }
      rec.played += 1;
      if (m.won) rec.wins += 1;
      else rec.losses += 1;
      const d = m.completedTime || m.tournamentEnd;
      if (d && (!rec.lastPlayed || new Date(d) > new Date(rec.lastPlayed))) {
        rec.lastPlayed = d;
        // Surface the partner from the most recent match against this opp
        rec.opponentPartnerName = m.opponent.partnerName || null;
        rec.isDoubles = isDoublesFormat(m.categoryFormat);
      }
    }

    const headToHead = Array.from(byOpponent.values())
      .sort((a, b) => b.played - a.played || (a.opponentName || '').localeCompare(b.opponentName || ''));

    res.status(200).json({
      success: true,
      data: {
        playerId,
        hasActiveSubscription: true,
        totalMatches: matches.length,
        wins,
        losses,
        winPercentage: matches.length ? Math.round((wins / matches.length) * 100) : 0,
        matches,
        headToHead,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Head-to-head record between two specific registered players.
// @route   GET /api/players/:playerA/head-to-head/:playerB
// @access  Public
export const getHeadToHead = async (req, res) => {
  try {
    const { playerA, playerB } = req.params;
    if (!playerA || !playerB || playerA === playerB) {
      return res.status(400).json({ success: false, message: 'Two distinct player ids are required' });
    }
    if (isWalkinId(playerA) || isWalkinId(playerB)) {
      return res.status(400).json({ success: false, message: 'Walk-in players cannot be queried for head-to-head' });
    }

    const [aActive, bActive] = await Promise.all([
      MembershipSubscription.hasActiveSubscription(playerA, 'player'),
      MembershipSubscription.hasActiveSubscription(playerB, 'player'),
    ]);
    if (!aActive || !bActive) {
      const users = await User.find(
        { _id: { $in: [playerA, playerB] } },
        'firstName lastName club'
      ).lean();
      const usersById = new Map(users.map((u) => [u._id.toString(), u]));
      const lockedProfile = (id) => {
        const u = usersById.get(String(id));
        return {
          id,
          name: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : null,
          zpin: null,
          club: u?.club || null,
        };
      };
      return res.status(200).json({
        success: true,
        data: {
          playerA: lockedProfile(playerA),
          playerB: lockedProfile(playerB),
          hasActiveSubscription: false,
          playerAActive: aActive,
          playerBActive: bActive,
          total: 0,
          aWins: 0,
          bWins: 0,
          matches: [],
        },
      });
    }

    const [tournaments, users] = await Promise.all([
      Tournament.find({}, 'name startDate endDate categories').lean(),
      User.find({ _id: { $in: [playerA, playerB] } }, 'firstName lastName zpin club').lean(),
    ]);

    const usersById = new Map(users.map((u) => [u._id.toString(), u]));

    const matches = [];
    for (const t of tournaments) {
      for (const { category, match, stage, partnerMap } of iterCompletedMatches(t)) {
        const ids = [match.player1.id, match.player2.id];
        if (!ids.includes(playerA) || !ids.includes(playerB)) continue;
        const aIsP1 = match.player1.id === playerA;
        const aPartner = partnerMap?.get(String(playerA)) || null;
        const bPartner = partnerMap?.get(String(playerB)) || null;
        matches.push({
          tournamentId: t._id,
          tournamentName: t.name,
          tournamentStart: t.startDate,
          tournamentEnd: t.endDate,
          categoryId: category._id,
          categoryName: category.name,
          categoryFormat: category.format,
          matchId: match._id,
          round: match.round,
          roundName: match.roundName,
          stage,
          playerAName: aIsP1 ? match.player1.name : match.player2.name,
          playerBName: aIsP1 ? match.player2.name : match.player1.name,
          playerAPartnerName: aPartner?.name || null,
          playerBPartnerName: bPartner?.name || null,
          score: match.score || '',
          winner: match.winner,
          aWon: match.winner === playerA,
          completedTime: match.completedTime || null,
        });
      }
    }

    matches.sort((a, b) => {
      const ad = new Date(a.completedTime || a.tournamentEnd || 0).getTime();
      const bd = new Date(b.completedTime || b.tournamentEnd || 0).getTime();
      return bd - ad;
    });

    const aWins = matches.filter((m) => m.aWon).length;
    const bWins = matches.length - aWins;

    const toProfile = (id) => {
      const u = usersById.get(String(id));
      if (!u) return { id, name: null, zpin: null, club: null };
      return {
        id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        zpin: u.zpin || null,
        club: u.club || null,
      };
    };

    res.status(200).json({
      success: true,
      data: {
        playerA: toProfile(playerA),
        playerB: toProfile(playerB),
        hasActiveSubscription: true,
        total: matches.length,
        aWins,
        bWins,
        matches,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
