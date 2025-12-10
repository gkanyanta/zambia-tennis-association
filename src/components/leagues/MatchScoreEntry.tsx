import React, { useState } from 'react';
import { Save, Trophy, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface Set {
  setNumber: number;
  homeGames: number;
  awayGames: number;
  tiebreak?: {
    played: boolean;
    homePoints?: number;
    awayPoints?: number;
  };
}

interface Match {
  matchType: string;
  homePlayer?: any;
  awayPlayer?: any;
  homePlayers?: any[];
  awayPlayers?: any[];
  sets: Set[];
  status: string;
  homeSetsWon?: number;
  awaySetsWon?: number;
  winner?: string;
}

interface MatchScoreEntryProps {
  match: Match;
  matchIndex: number;
  matchTitle: string;
  homeTeamName: string;
  awayTeamName: string;
  onSave: (matchIndex: number, sets: Set[], status: string) => Promise<void>;
}

const MatchScoreEntry: React.FC<MatchScoreEntryProps> = ({
  match,
  matchIndex,
  matchTitle,
  homeTeamName,
  awayTeamName,
  onSave
}) => {
  const [sets, setSets] = useState<Set[]>(
    match.sets && match.sets.length > 0
      ? match.sets
      : [{ setNumber: 1, homeGames: 0, awayGames: 0 }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const getPlayerName = (player: any) => {
    if (!player) return 'TBD';
    return player.firstName && player.lastName
      ? `${player.firstName} ${player.lastName}`
      : player;
  };

  const getPlayersDisplay = () => {
    if (match.matchType === 'doubles') {
      const homePlayers = match.homePlayers || [];
      const awayPlayers = match.awayPlayers || [];
      return {
        home: homePlayers.length >= 2
          ? `${getPlayerName(homePlayers[0])} / ${getPlayerName(homePlayers[1])}`
          : 'TBD',
        away: awayPlayers.length >= 2
          ? `${getPlayerName(awayPlayers[0])} / ${getPlayerName(awayPlayers[1])}`
          : 'TBD'
      };
    } else {
      return {
        home: getPlayerName(match.homePlayer),
        away: getPlayerName(match.awayPlayer)
      };
    }
  };

  const validateSet = (set: Set): string | null => {
    const { homeGames, awayGames } = set;

    // Basic validation
    if (homeGames < 0 || awayGames < 0) {
      return 'Games cannot be negative';
    }

    if (homeGames > 7 || awayGames > 7) {
      return 'Maximum 7 games per set';
    }

    // If both are 0, it's not started
    if (homeGames === 0 && awayGames === 0) {
      return null;
    }

    const diff = Math.abs(homeGames - awayGames);
    const maxScore = Math.max(homeGames, awayGames);

    // Standard win: 6 games with 2+ game margin
    if (maxScore === 6) {
      if (diff < 2) {
        return 'Must win by 2 games when score is 6-x';
      }
      return null; // Valid: 6-4, 6-3, 6-2, 6-1, 6-0
    }

    // Tiebreak set: 7-6 or 6-7
    if (maxScore === 7) {
      if ((homeGames === 7 && awayGames === 6) || (awayGames === 7 && homeGames === 6)) {
        if (!set.tiebreak?.played) {
          return 'Tiebreak details required for 7-6 score';
        }
        return null; // Valid tiebreak
      }
      // 7-5 is also valid
      if ((homeGames === 7 && awayGames === 5) || (awayGames === 7 && homeGames === 5)) {
        return null;
      }
      return 'Score of 7 must be 7-6 (tiebreak) or 7-5';
    }

    // Incomplete set or invalid
    if (maxScore < 6) {
      return null; // Allow incomplete sets (in progress)
    }

    return 'Invalid tennis score';
  };

  const validateAllSets = (): string | null => {
    for (const set of sets) {
      const error = validateSet(set);
      if (error) {
        return `Set ${set.setNumber}: ${error}`;
      }
    }
    return null;
  };

  const calculateSetsWon = () => {
    let homeSetsWon = 0;
    let awaySetsWon = 0;

    sets.forEach(set => {
      if (set.homeGames > set.awayGames) {
        homeSetsWon++;
      } else if (set.awayGames > set.homeGames) {
        awaySetsWon++;
      }
    });

    return { homeSetsWon, awaySetsWon };
  };

  const updateSetScore = (setIndex: number, field: 'homeGames' | 'awayGames', value: number) => {
    const newSets = [...sets];
    newSets[setIndex] = {
      ...newSets[setIndex],
      [field]: Math.max(0, Math.min(7, value))
    };

    // Auto-detect tiebreak
    const set = newSets[setIndex];
    if ((set.homeGames === 7 && set.awayGames === 6) || (set.awayGames === 7 && set.homeGames === 6)) {
      if (!set.tiebreak) {
        newSets[setIndex].tiebreak = {
          played: true,
          homePoints: 0,
          awayPoints: 0
        };
      }
    } else {
      // Remove tiebreak if score changes
      if (newSets[setIndex].tiebreak) {
        delete newSets[setIndex].tiebreak;
      }
    }

    setSets(newSets);
    setError('');
  };

  const updateTiebreak = (setIndex: number, field: 'homePoints' | 'awayPoints', value: number) => {
    const newSets = [...sets];
    if (!newSets[setIndex].tiebreak) {
      newSets[setIndex].tiebreak = { played: true, homePoints: 0, awayPoints: 0 };
    }
    newSets[setIndex].tiebreak![field] = Math.max(0, value);
    setSets(newSets);
  };

  const addSet = () => {
    if (sets.length >= 5) {
      setError('Maximum 5 sets allowed');
      return;
    }

    // Check if match is already won
    const { homeSetsWon, awaySetsWon } = calculateSetsWon();
    if (homeSetsWon >= 2 || awaySetsWon >= 2) {
      setError('Match is already won (best of 3)');
      return;
    }

    setSets([...sets, { setNumber: sets.length + 1, homeGames: 0, awayGames: 0 }]);
  };

  const removeSet = (setIndex: number) => {
    if (sets.length <= 1) {
      setError('At least one set required');
      return;
    }
    const newSets = sets.filter((_, index) => index !== setIndex);
    // Renumber sets
    newSets.forEach((set, index) => {
      set.setNumber = index + 1;
    });
    setSets(newSets);
  };

  const handleSave = async () => {
    const validationError = validateAllSets();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if match has a winner
    const { homeSetsWon, awaySetsWon } = calculateSetsWon();
    const isComplete = homeSetsWon >= 2 || awaySetsWon >= 2;

    try {
      setSaving(true);
      setError('');
      await onSave(matchIndex, sets, isComplete ? 'completed' : 'in_progress');
    } catch (err: any) {
      setError(err.message || 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const players = getPlayersDisplay();
  const { homeSetsWon, awaySetsWon } = calculateSetsWon();
  const matchComplete = homeSetsWon >= 2 || awaySetsWon >= 2;

  return (
    <div className="border rounded-lg p-6 mb-6">
      {/* Match Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{matchTitle}</h3>
          {matchComplete && (
            <div className="flex items-center text-green-600">
              <Trophy className="h-5 w-5 mr-2" />
              <span className="font-semibold">Match Complete</span>
            </div>
          )}
        </div>

        {/* Players */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">{homeTeamName}</p>
              <p className="font-semibold">{players.home}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">{awayTeamName}</p>
              <p className="font-semibold">{players.away}</p>
            </div>
          </div>

          {/* Sets Won Display */}
          {(homeSetsWon > 0 || awaySetsWon > 0) && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold text-blue-600">{homeSetsWon}</p>
                  <p className="text-xs text-gray-600">Sets Won</p>
                </div>
                <div className="text-2xl text-gray-400 px-4">-</div>
                <div className="text-center flex-1">
                  <p className="text-3xl font-bold text-blue-600">{awaySetsWon}</p>
                  <p className="text-xs text-gray-600">Sets Won</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Sets */}
      <div className="space-y-4 mb-4">
        {sets.map((set, index) => (
          <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Set {set.setNumber}</h4>
              {sets.length > 1 && (
                <button
                  onClick={() => removeSet(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove set"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Home Score */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">{homeTeamName} Games</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={set.homeGames}
                  onChange={(e) => updateSetScore(index, 'homeGames', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-2xl font-bold"
                />
              </div>

              {/* Away Score */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">{awayTeamName} Games</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={set.awayGames}
                  onChange={(e) => updateSetScore(index, 'awayGames', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-2xl font-bold"
                />
              </div>
            </div>

            {/* Tiebreak */}
            {set.tiebreak?.played && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="text-sm font-semibold mb-3 text-gray-700">Tiebreak Points</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{homeTeamName}</label>
                    <input
                      type="number"
                      min="0"
                      value={set.tiebreak.homePoints || 0}
                      onChange={(e) => updateTiebreak(index, 'homePoints', parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-center font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{awayTeamName}</label>
                    <input
                      type="number"
                      min="0"
                      value={set.tiebreak.awayPoints || 0}
                      onChange={(e) => updateTiebreak(index, 'awayPoints', parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-center font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Set Winner Indicator */}
            {set.homeGames > 0 || set.awayGames > 0 ? (
              <div className="mt-3 text-center">
                {set.homeGames > set.awayGames ? (
                  <span className="text-sm text-green-600 font-semibold">
                    ✓ {homeTeamName} won this set
                  </span>
                ) : set.awayGames > set.homeGames ? (
                  <span className="text-sm text-green-600 font-semibold">
                    ✓ {awayTeamName} won this set
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">In progress</span>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Add Set Button */}
      {!matchComplete && sets.length < 3 && (
        <button
          onClick={addSet}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-600 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center mb-4"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Set
        </button>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
      >
        {saving ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Saving...
          </>
        ) : (
          <>
            <Save className="h-5 w-5 mr-2" />
            Save Match Score
          </>
        )}
      </button>
    </div>
  );
};

export default MatchScoreEntry;
