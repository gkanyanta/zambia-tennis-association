import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Users, Trophy, AlertCircle, CheckCircle } from 'lucide-react';
import {
  fetchFixture,
  fetchAvailablePlayers,
  updateFixturePlayers,
  updateMatchScore
} from '../../services/leagueService';
import MatchScoreEntry from './MatchScoreEntry';

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  zpin?: string;
}

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

const FixtureScoreEntry: React.FC = () => {
  const { leagueId, fixtureId } = useParams<{ leagueId: string; fixtureId: string }>();
  const navigate = useNavigate();

  const [fixture, setFixture] = useState<any | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'players' | 'scores'>('players');

  // Player selections
  const [singles1Home, setSingles1Home] = useState('');
  const [singles1Away, setSingles1Away] = useState('');
  const [singles2Home, setSingles2Home] = useState('');
  const [singles2Away, setSingles2Away] = useState('');
  const [doublesHome1, setDoublesHome1] = useState('');
  const [doublesHome2, setDoublesHome2] = useState('');
  const [doublesAway1, setDoublesAway1] = useState('');
  const [doublesAway2, setDoublesAway2] = useState('');

  // Load fixture and players
  useEffect(() => {
    const loadData = async () => {
      if (!leagueId || !fixtureId) return;

      try {
        setLoading(true);
        const [fixtureData, playersData] = await Promise.all([
          fetchFixture(leagueId, fixtureId),
          fetchAvailablePlayers(leagueId, fixtureId)
        ]);

        setFixture(fixtureData.data);
        setPlayers(playersData.data);

        // Pre-fill existing player selections
        if (fixtureData.data.matches && fixtureData.data.matches.length > 0) {
          const matches: any[] = fixtureData.data.matches;
          const getPlayerId = (player: string | { _id: string } | undefined) => {
            if (!player) return '';
            return typeof player === 'string' ? player : player._id;
          };

          if (matches[0]) {
            setSingles1Home(getPlayerId(matches[0].homePlayer));
            setSingles1Away(getPlayerId(matches[0].awayPlayer));
          }
          if (matches[1]) {
            setSingles2Home(getPlayerId(matches[1].homePlayer));
            setSingles2Away(getPlayerId(matches[1].awayPlayer));
          }
          if (matches[2]) {
            setDoublesHome1(getPlayerId(matches[2].homePlayers?.[0]));
            setDoublesHome2(getPlayerId(matches[2].homePlayers?.[1]));
            setDoublesAway1(getPlayerId(matches[2].awayPlayers?.[0]));
            setDoublesAway2(getPlayerId(matches[2].awayPlayers?.[1]));
          }

          // If players are already assigned and some matches have scores, go to scores step
          if (matches.some(m => m.sets && m.sets.length > 0)) {
            setStep('scores');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [leagueId, fixtureId]);

  const handleSavePlayers = async () => {
    if (!leagueId || !fixtureId) return;

    // Validation
    if (!singles1Home || !singles1Away || !singles2Home || !singles2Away ||
        !doublesHome1 || !doublesHome2 || !doublesAway1 || !doublesAway2) {
      setError('Please select all players');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await updateFixturePlayers(leagueId, fixtureId, {
        matches: [
          {
            matchType: 'singles1',
            homePlayer: singles1Home,
            awayPlayer: singles1Away
          },
          {
            matchType: 'singles2',
            homePlayer: singles2Home,
            awayPlayer: singles2Away
          },
          {
            matchType: 'doubles',
            homePlayers: [doublesHome1, doublesHome2],
            awayPlayers: [doublesAway1, doublesAway2]
          }
        ]
      });

      setFixture(response.data);
      setStep('scores');
    } catch (err: any) {
      setError(err.message || 'Failed to save players');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMatchScore = async (matchIndex: number, sets: Set[], status: string) => {
    if (!leagueId || !fixtureId) return;

    try {
      const response = await updateMatchScore(leagueId, fixtureId, matchIndex, {
        sets,
        status
      });

      setFixture(response.data);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save match score');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Fixture not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/leagues/${leagueId}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to League
        </button>

        <h1 className="text-3xl font-bold text-gray-900">Match Score Entry</h1>
        <p className="text-gray-600 mt-2">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </p>
        <p className="text-sm text-gray-500">
          {new Date(fixture.scheduledDate).toLocaleDateString()} • {fixture.venue}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center ${step === 'players' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
              step === 'players' ? 'border-blue-600 bg-blue-50' : 'border-green-600 bg-green-50'
            }`}>
              {step === 'scores' ? <Users className="h-5 w-5" /> : '1'}
            </div>
            <span className="ml-3 font-medium">Select Players</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-4"></div>
          <div className={`flex items-center ${step === 'scores' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 ${
              step === 'scores' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
            }`}>
              {step === 'scores' ? <Trophy className="h-5 w-5" /> : '2'}
            </div>
            <span className="ml-3 font-medium">Enter Scores</span>
          </div>
        </div>
      </div>

      {step === 'players' ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-6">Select Players for Each Match</h2>

          {/* Singles 1 */}
          <div className="mb-8 pb-8 border-b">
            <h3 className="font-semibold text-lg mb-4">Singles 1</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {fixture.homeTeam.name} Player
                </label>
                <select
                  value={singles1Home}
                  onChange={(e) => setSingles1Home(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select player...</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {fixture.awayTeam.name} Player
                </label>
                <select
                  value={singles1Away}
                  onChange={(e) => setSingles1Away(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select player...</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Singles 2 */}
          <div className="mb-8 pb-8 border-b">
            <h3 className="font-semibold text-lg mb-4">Singles 2</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {fixture.homeTeam.name} Player
                </label>
                <select
                  value={singles2Home}
                  onChange={(e) => setSingles2Home(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select player...</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {fixture.awayTeam.name} Player
                </label>
                <select
                  value={singles2Away}
                  onChange={(e) => setSingles2Away(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select player...</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Doubles */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Doubles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {fixture.homeTeam.name} Players
                </label>
                <select
                  value={doublesHome1}
                  onChange={(e) => setDoublesHome1(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                >
                  <option value="">Select player 1...</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
                <select
                  value={doublesHome2}
                  onChange={(e) => setDoublesHome2(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select player 2...</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {fixture.awayTeam.name} Players
                </label>
                <select
                  value={doublesAway1}
                  onChange={(e) => setDoublesAway1(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                >
                  <option value="">Select player 1...</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
                <select
                  value={doublesAway2}
                  onChange={(e) => setDoublesAway2(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select player 2...</option>
                  {players.map(player => (
                    <option key={player._id} value={player._id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSavePlayers}
              disabled={saving}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save & Continue to Scores
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Enter Match Scores</h2>
              <button
                onClick={() => setStep('players')}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                Change Players
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Enter the score for each set. The match is best of 3 sets. Games are won when a player/team reaches 6 games with a 2-game margin, or 7-6 via tiebreak.
            </p>

            {/* Overall Score Display */}
            {fixture.overallScore && (fixture.overallScore.homeWins > 0 || fixture.overallScore.awayWins > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Overall Tie Score</h3>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-blue-600">{fixture.overallScore.homeWins}</p>
                    <p className="text-sm text-gray-600 mt-1">{fixture.homeTeam.name}</p>
                  </div>
                  <div className="text-3xl text-gray-400 px-8">-</div>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-blue-600">{fixture.overallScore.awayWins}</p>
                    <p className="text-sm text-gray-600 mt-1">{fixture.awayTeam.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Status */}
            {fixture.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <p className="font-semibold text-green-900">Fixture Complete!</p>
                  <p className="text-sm text-green-700">All matches have been completed and the standings have been updated.</p>
                </div>
              </div>
            )}
          </div>

          {/* Match Score Entry Components */}
          {fixture.matches && fixture.matches.length > 0 && (
            <div>
              <MatchScoreEntry
                match={fixture.matches[0]}
                matchIndex={0}
                matchTitle="Singles 1"
                homeTeamName={fixture.homeTeam.name}
                awayTeamName={fixture.awayTeam.name}
                onSave={handleSaveMatchScore}
              />

              <MatchScoreEntry
                match={fixture.matches[1]}
                matchIndex={1}
                matchTitle="Singles 2"
                homeTeamName={fixture.homeTeam.name}
                awayTeamName={fixture.awayTeam.name}
                onSave={handleSaveMatchScore}
              />

              <MatchScoreEntry
                match={fixture.matches[2]}
                matchIndex={2}
                matchTitle="Doubles"
                homeTeamName={fixture.homeTeam.name}
                awayTeamName={fixture.awayTeam.name}
                onSave={handleSaveMatchScore}
              />
            </div>
          )}

          {/* Back to League Button */}
          <div className="mt-6">
            <button
              onClick={() => navigate(`/leagues/${leagueId}`)}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-semibold"
            >
              Back to League
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixtureScoreEntry;
