import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Users, Trophy, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import {
  fetchTie,
  fetchAvailablePlayers,
  fetchLeague,
  updateTiePlayers,
  updateRubberScore,
  Tie,
  Player,
  TieSet,
  MATCH_FORMATS
} from '../../services/leagueService';
import RubberScoreEntry from './RubberScoreEntry';

const TieScoreEntry: React.FC = () => {
  const { leagueId, tieId } = useParams<{ leagueId: string; tieId: string }>();
  const navigate = useNavigate();

  const [tie, setTie] = useState<Tie | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchFormat, setMatchFormat] = useState('2s1d');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'players' | 'scores'>('players');

  // Dynamic player selections: { [rubberIndex]: { home, away, homePartner, awayPartner } }
  const [selections, setSelections] = useState<Record<number, { home: string; away: string; homePartner?: string; awayPartner?: string }>>({});

  useEffect(() => {
    loadData();
  }, [leagueId, tieId]);

  const loadData = async () => {
    if (!leagueId || !tieId) return;
    setLoading(true);
    try {
      const [tieRes, playersRes, leagueRes] = await Promise.all([
        fetchTie(leagueId, tieId),
        fetchAvailablePlayers(leagueId, tieId).catch(() => ({ data: [] })),
        fetchLeague(leagueId)
      ]);

      setTie(tieRes.data);
      setPlayers(playersRes.data || []);

      const format = leagueRes.data?.settings?.matchFormat || '2s1d';
      setMatchFormat(format);

      // Pre-fill player selections from existing rubber data
      const sel: typeof selections = {};
      tieRes.data.rubbers.forEach((rubber, idx) => {
        const isDoubles = rubber.type.startsWith('doubles');
        if (isDoubles) {
          sel[idx] = {
            home: rubber.homePlayers?.[0]?._id || '',
            away: rubber.awayPlayers?.[0]?._id || '',
            homePartner: rubber.homePlayers?.[1]?._id || '',
            awayPartner: rubber.awayPlayers?.[1]?._id || ''
          };
        } else {
          sel[idx] = {
            home: rubber.homePlayer?._id || '',
            away: rubber.awayPlayer?._id || ''
          };
        }
      });
      setSelections(sel);

      // If players are already assigned, go directly to scores
      const hasPlayers = tieRes.data.rubbers.some(r =>
        r.homePlayer || (r.homePlayers && r.homePlayers.length > 0)
      );
      if (hasPlayers) setStep('scores');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tie data');
    } finally {
      setLoading(false);
    }
  };

  const formatDefs = MATCH_FORMATS[matchFormat] || MATCH_FORMATS['2s1d'];

  const homePlayers = players.filter(p => p.clubId === tie?.homeTeam?._id);
  const awayPlayers = players.filter(p => p.clubId === tie?.awayTeam?._id);

  const handleSavePlayers = async () => {
    if (!leagueId || !tieId || !tie) return;
    setSaving(true);
    setError('');
    try {
      const rubbersData = tie.rubbers.map((rubber, idx) => {
        const sel = selections[idx] || {};
        const isDoubles = rubber.type.startsWith('doubles');
        if (isDoubles) {
          return {
            homePlayers: [sel.home, sel.homePartner].filter((v): v is string => !!v),
            awayPlayers: [sel.away, sel.awayPartner].filter((v): v is string => !!v)
          };
        }
        return { homePlayer: sel.home || undefined, awayPlayer: sel.away || undefined };
      });

      const res = await updateTiePlayers(leagueId, tieId, { rubbers: rubbersData });
      setTie(res.data);
      setStep('scores');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save player selections');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRubberScore = async (rubberIndex: number, sets: TieSet[], status: string) => {
    if (!leagueId || !tieId) return;
    setSaving(true);
    setError('');
    try {
      const res = await updateRubberScore(leagueId, tieId, rubberIndex, { sets, status });
      setTie(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save rubber score');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!tie) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error || 'Tie not found'}</span>
        </div>
      </div>
    );
  }

  const completedCount = tie.rubbers.filter(r => ['completed', 'retired', 'walkover', 'defaulted'].includes(r.status)).length;
  const totalRubbers = tie.rubbers.length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/leagues')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {tie.homeTeam.name} vs {tie.awayTeam.name}
          </h1>
          <p className="text-gray-600">
            Round {tie.round} - {new Date(tie.scheduledDate).toLocaleDateString()} - {tie.venue}
          </p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{tie.score.home} - {tie.score.away}</div>
          <div className="text-sm text-gray-500">{completedCount}/{totalRubbers} rubbers</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      {/* Step tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setStep('players')}
          className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 ${
            step === 'players' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4" /> 1. Player Selection
        </button>
        <button
          onClick={() => setStep('scores')}
          className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 ${
            step === 'scores' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Trophy className="h-4 w-4" /> 2. Score Entry
        </button>
      </div>

      {/* Step 1: Player Selection */}
      {step === 'players' && (
        <div className="space-y-6">
          {tie.rubbers.map((rubber, idx) => {
            const def = formatDefs[idx];
            const isDoubles = rubber.type.startsWith('doubles');
            const sel = selections[idx] || { home: '', away: '' };

            return (
              <div key={idx} className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-3">{def?.label || rubber.type}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {tie.homeTeam.name} {isDoubles ? '- Player 1' : ''}
                    </label>
                    <select
                      value={sel.home}
                      onChange={e => setSelections({ ...selections, [idx]: { ...sel, home: e.target.value } })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select player</option>
                      {homePlayers.map(p => (
                        <option key={p._id} value={p._id}>{p.firstName} {p.lastName}{p.zpin ? ` (${p.zpin})` : ''}</option>
                      ))}
                    </select>
                    {isDoubles && (
                      <select
                        value={sel.homePartner || ''}
                        onChange={e => setSelections({ ...selections, [idx]: { ...sel, homePartner: e.target.value } })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-2"
                      >
                        <option value="">Select partner</option>
                        {homePlayers.map(p => (
                          <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {tie.awayTeam.name} {isDoubles ? '- Player 1' : ''}
                    </label>
                    <select
                      value={sel.away}
                      onChange={e => setSelections({ ...selections, [idx]: { ...sel, away: e.target.value } })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select player</option>
                      {awayPlayers.map(p => (
                        <option key={p._id} value={p._id}>{p.firstName} {p.lastName}{p.zpin ? ` (${p.zpin})` : ''}</option>
                      ))}
                    </select>
                    {isDoubles && (
                      <select
                        value={sel.awayPartner || ''}
                        onChange={e => setSelections({ ...selections, [idx]: { ...sel, awayPartner: e.target.value } })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-2"
                      >
                        <option value="">Select partner</option>
                        {awayPlayers.map(p => (
                          <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end">
            <button
              onClick={handleSavePlayers}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save & Continue to Scores
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Score Entry */}
      {step === 'scores' && (
        <div className="space-y-6">
          {tie.rubbers.map((rubber, idx) => {
            const def = formatDefs[idx];
            const isDoubles = rubber.type.startsWith('doubles');
            const homeName = isDoubles
              ? (rubber.homePlayers?.map(p => `${p.firstName} ${p.lastName}`).join(' / ') || tie.homeTeam.name)
              : (rubber.homePlayer ? `${rubber.homePlayer.firstName} ${rubber.homePlayer.lastName}` : tie.homeTeam.name);
            const awayName = isDoubles
              ? (rubber.awayPlayers?.map(p => `${p.firstName} ${p.lastName}`).join(' / ') || tie.awayTeam.name)
              : (rubber.awayPlayer ? `${rubber.awayPlayer.firstName} ${rubber.awayPlayer.lastName}` : tie.awayTeam.name);

            return (
              <RubberScoreEntry
                key={idx}
                rubberIndex={idx}
                title={def?.label || rubber.type}
                homeName={homeName}
                awayName={awayName}
                existingSets={rubber.sets}
                existingStatus={rubber.status}
                winner={rubber.winner}
                onSave={(sets, status) => handleSaveRubberScore(idx, sets, status)}
                saving={saving}
              />
            );
          })}

          {tie.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Tie completed: {tie.homeTeam.name} {tie.score.home} - {tie.score.away} {tie.awayTeam.name}
                {tie.isDraw ? ' (Draw)' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TieScoreEntry;
