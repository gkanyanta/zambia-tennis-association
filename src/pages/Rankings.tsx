import { useState, useEffect } from 'react';
import { Hero } from '@/components/Hero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { rankingService, Ranking } from '@/services/rankingService';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';

type RankingCategory = 'mens-singles' | 'womens-singles' | 'juniors-boys' | 'juniors-girls';

const categories = [
  { id: 'mens-singles', label: "Men's Singles" },
  { id: 'womens-singles', label: "Women's Singles" },
  { id: 'juniors-boys', label: 'Juniors Boys' },
  { id: 'juniors-girls', label: 'Juniors Girls' },
] as const;

export function Rankings() {
  const { isAdmin } = useAuth();
  const [activeCategory, setActiveCategory] = useState<RankingCategory>('mens-singles');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    rank: 0,
    name: '',
    club: '',
    points: 0
  });

  useEffect(() => {
    fetchRankings();
  }, [activeCategory]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const data = await rankingService.getRankingsByCategory(activeCategory);
      setRankings(data);
    } catch (err) {
      console.error('Failed to load rankings:', err);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRanking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rankingService.createOrUpdateRanking({
        ...formData,
        category: activeCategory
      });
      alert('Ranking added successfully!');
      setShowAddForm(false);
      setFormData({ rank: 0, name: '', club: '', points: 0 });
      await fetchRankings();
    } catch (err: any) {
      alert(err.message || 'Failed to add ranking');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ranking?')) return;
    try {
      await rankingService.deleteRanking(id);
      alert('Ranking deleted successfully!');
      await fetchRankings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ranking');
    }
  };

  return (
    <div className="flex flex-col">
      <Hero
        title="National Rankings"
        description="Official ZTA rankings across all categories, updated bi-monthly"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex gap-2 mb-6">
              <Button onClick={() => setShowAddForm(!showAddForm)}>
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add Player'}
              </Button>
              <Button variant="outline" onClick={fetchRankings}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          )}

          {/* Add Form */}
          {isAdmin && showAddForm && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <form onSubmit={handleAddRanking} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    type="number"
                    placeholder="Rank"
                    value={formData.rank || ''}
                    onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) })}
                    required
                  />
                  <Input
                    placeholder="Player Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Club"
                    value={formData.club}
                    onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                    required
                  />
                  <Input
                    type="number"
                    placeholder="Points"
                    value={formData.points || ''}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                    required
                  />
                  <Button type="submit" className="md:col-span-4">Add to Rankings</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Rankings Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Rank</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Player</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Club</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold">Points</th>
                      {isAdmin && <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-muted-foreground">
                          Loading rankings...
                        </td>
                      </tr>
                    ) : rankings.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="px-6 py-12 text-center text-muted-foreground">
                          No rankings available for this category.
                          {isAdmin && ' Click "Add Player" to get started.'}
                        </td>
                      </tr>
                    ) : (
                      rankings.map((player, index) => (
                        <tr key={player._id || index} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-bold text-muted-foreground">
                                {player.rank}
                              </span>
                              {player.rank <= 3 && (
                                <Badge variant={player.rank === 1 ? 'default' : 'secondary'}>
                                  {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{player.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-muted-foreground">{player.club}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono font-semibold">{player.points}</span>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(player._id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="mt-8 bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold mb-3">About Rankings</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Rankings are updated bi-monthly based on tournament performance</p>
              <p>• Points are awarded based on tournament category and finishing position</p>
              <p>• National championships carry the most ranking points</p>
              <p>• Players must maintain active ZTA membership to be ranked</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
