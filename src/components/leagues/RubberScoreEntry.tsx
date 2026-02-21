import React, { useState } from 'react';
import { Save, Trophy, AlertCircle, Plus, Trash2, Loader2 } from 'lucide-react';
import { TieSet } from '../../services/leagueService';

interface RubberScoreEntryProps {
  rubberIndex: number;
  title: string;
  homeName: string;
  awayName: string;
  existingSets: TieSet[];
  existingStatus: string;
  winner: 'home' | 'away' | null;
  onSave: (sets: TieSet[], status: string) => Promise<void>;
  saving: boolean;
  matchTiebreak?: boolean;
}

const RubberScoreEntry: React.FC<RubberScoreEntryProps> = ({
  title,
  homeName,
  awayName,
  existingSets,
  existingStatus,
  winner,
  onSave,
  saving,
  matchTiebreak = false
}) => {
  const [sets, setSets] = useState<TieSet[]>(
    existingSets && existingSets.length > 0
      ? existingSets
      : [{ setNumber: 1, homeGames: 0, awayGames: 0 }]
  );
  const [error, setError] = useState('');

  const validateSet = (set: TieSet): string | null => {
    const { homeGames, awayGames } = set;
    if (homeGames < 0 || awayGames < 0) return 'Games/points cannot be negative';

    // Match tiebreak set: validate as tiebreak points (first to 10, win by 2)
    if (set.isMatchTiebreak) {
      if (homeGames === 0 && awayGames === 0) return null;
      const high = Math.max(homeGames, awayGames);
      const diff = Math.abs(homeGames - awayGames);
      if (high < 10) return 'Winner must reach at least 10 points';
      if (diff < 2) return 'Must win by 2 points';
      return null;
    }

    if (homeGames > 7 || awayGames > 7) return 'Maximum 7 games per set';
    if (homeGames === 0 && awayGames === 0) return null;

    const maxScore = Math.max(homeGames, awayGames);
    const diff = Math.abs(homeGames - awayGames);

    if (maxScore === 6 && diff < 2) return 'Must win by 2 games at 6-x';
    if (maxScore === 7) {
      const minScore = Math.min(homeGames, awayGames);
      if (minScore === 6) {
        if (!set.tiebreak?.played) return 'Tiebreak details required for 7-6';
        return null;
      }
      if (minScore === 5) return null;
      return 'Score of 7 must be 7-5 or 7-6';
    }
    return null;
  };

  const calculateSetsWon = () => {
    let home = 0, away = 0;
    sets.forEach(s => {
      if (s.homeGames > s.awayGames) home++;
      else if (s.awayGames > s.homeGames) away++;
    });
    return { home, away };
  };

  const updateSetScore = (idx: number, field: 'homeGames' | 'awayGames', value: number) => {
    const newSets = [...sets];
    const isMatchTB = newSets[idx].isMatchTiebreak;
    newSets[idx] = { ...newSets[idx], [field]: isMatchTB ? Math.max(0, value) : Math.max(0, Math.min(7, value)) };

    if (!isMatchTB) {
      const s = newSets[idx];
      if ((s.homeGames === 7 && s.awayGames === 6) || (s.awayGames === 7 && s.homeGames === 6)) {
        if (!s.tiebreak) newSets[idx].tiebreak = { played: true, homePoints: 0, awayPoints: 0 };
      } else {
        if (newSets[idx].tiebreak) delete newSets[idx].tiebreak;
      }
    }

    setSets(newSets);
    setError('');
  };

  const updateTiebreak = (idx: number, field: 'homePoints' | 'awayPoints', value: number) => {
    const newSets = [...sets];
    if (!newSets[idx].tiebreak) newSets[idx].tiebreak = { played: true, homePoints: 0, awayPoints: 0 };
    newSets[idx].tiebreak![field] = Math.max(0, value);
    setSets(newSets);
  };

  const addSet = () => {
    const { home, away } = calculateSetsWon();
    if (home >= 2 || away >= 2) { setError('Rubber already decided (best of 3)'); return; }
    if (sets.length >= 3) { setError('Maximum 3 sets for best of 3'); return; }
    const newSetNumber = sets.length + 1;
    // 3rd set as match tiebreak when league has matchTiebreak enabled and it's 1-1
    const isDecidingTiebreak = matchTiebreak && newSetNumber === 3 && home === 1 && away === 1;
    setSets([...sets, {
      setNumber: newSetNumber,
      homeGames: 0,
      awayGames: 0,
      ...(isDecidingTiebreak ? { isMatchTiebreak: true } : {})
    }]);
  };

  const removeSet = (idx: number) => {
    if (sets.length <= 1) return;
    const newSets = sets.filter((_, i) => i !== idx);
    newSets.forEach((s, i) => { s.setNumber = i + 1; });
    setSets(newSets);
  };

  const handleSave = async () => {
    for (const s of sets) {
      const err = validateSet(s);
      if (err) { setError(`Set ${s.setNumber}: ${err}`); return; }
    }
    const { home, away } = calculateSetsWon();
    const isComplete = home >= 2 || away >= 2;
    setError('');
    await onSave(sets, isComplete ? 'completed' : 'in_progress');
  };

  const { home: homeSetsWon, away: awaySetsWon } = calculateSetsWon();
  const rubberComplete = homeSetsWon >= 2 || awaySetsWon >= 2;
  const isAlreadyDone = ['completed', 'retired', 'walkover', 'defaulted'].includes(existingStatus);

  return (
    <div className={`border rounded-lg p-6 ${isAlreadyDone ? 'bg-gray-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        {(rubberComplete || isAlreadyDone) && (
          <div className="flex items-center text-green-600">
            <Trophy className="h-4 w-4 mr-1" />
            <span className="text-sm font-semibold">
              {winner === 'home' ? homeName.split(' / ')[0].split(' ').pop() : winner === 'away' ? awayName.split(' / ')[0].split(' ').pop() : ''} wins
            </span>
          </div>
        )}
      </div>

      {/* Players */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Home</p>
            <p className="font-medium text-sm">{homeName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Away</p>
            <p className="font-medium text-sm">{awayName}</p>
          </div>
        </div>
        {(homeSetsWon > 0 || awaySetsWon > 0) && (
          <div className="mt-3 pt-3 border-t flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{homeSetsWon}</p>
              <p className="text-xs text-gray-500">Sets</p>
            </div>
            <div className="text-xl text-gray-400 self-center">-</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{awaySetsWon}</p>
              <p className="text-xs text-gray-500">Sets</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded flex items-center text-sm">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Sets */}
      <div className="space-y-3 mb-4">
        {sets.map((set, idx) => (
          <div key={idx} className={`border rounded-lg p-3 ${set.isMatchTiebreak ? 'border-amber-300 bg-amber-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">
                {set.isMatchTiebreak ? 'Match Tiebreak (first to 10)' : `Set ${set.setNumber}`}
              </span>
              {sets.length > 1 && (
                <button onClick={() => removeSet(idx)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" min="0" max={set.isMatchTiebreak ? undefined : 7} value={set.homeGames}
                onChange={e => updateSetScore(idx, 'homeGames', parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-center text-xl font-bold"
                placeholder={set.isMatchTiebreak ? 'Pts' : undefined}
              />
              <input
                type="number" min="0" max={set.isMatchTiebreak ? undefined : 7} value={set.awayGames}
                onChange={e => updateSetScore(idx, 'awayGames', parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2 text-center text-xl font-bold"
                placeholder={set.isMatchTiebreak ? 'Pts' : undefined}
              />
            </div>

            {set.tiebreak?.played && !set.isMatchTiebreak && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs font-semibold text-gray-600 mb-1">Tiebreak</p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number" min="0" value={set.tiebreak.homePoints || 0}
                    onChange={e => updateTiebreak(idx, 'homePoints', parseInt(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-center text-sm font-semibold"
                  />
                  <input
                    type="number" min="0" value={set.tiebreak.awayPoints || 0}
                    onChange={e => updateTiebreak(idx, 'awayPoints', parseInt(e.target.value) || 0)}
                    className="w-full border rounded px-2 py-1 text-center text-sm font-semibold"
                  />
                </div>
              </div>
            )}

            {(set.homeGames > 0 || set.awayGames > 0) && (
              <div className="mt-2 text-center text-xs">
                {set.homeGames > set.awayGames
                  ? <span className="text-green-600 font-medium">{set.isMatchTiebreak ? 'Home wins tiebreak' : 'Home wins set'}</span>
                  : set.awayGames > set.homeGames
                  ? <span className="text-green-600 font-medium">{set.isMatchTiebreak ? 'Away wins tiebreak' : 'Away wins set'}</span>
                  : <span className="text-gray-500">In progress</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {!rubberComplete && sets.length < 3 && (
        <button onClick={addSet}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center text-sm mb-4">
          <Plus className="h-4 w-4 mr-1" /> Add Set
        </button>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-blue-500 text-white py-2.5 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center font-medium">
        {saving
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
          : <><Save className="h-4 w-4 mr-2" />Save Rubber Score</>}
      </button>
    </div>
  );
};

export default RubberScoreEntry;
