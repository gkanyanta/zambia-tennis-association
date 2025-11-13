import { useState } from 'react'
import { Hero } from '@/components/Hero'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { menSeniorRankings, womenSeniorRankings, juniorsRankings, madalasRankings, type RankingPlayer } from '@/data/rankingsData'

type RankingCategory = 'mens-singles' | 'womens-singles' | 'juniors' | 'madalas'

const rankingsData: Record<RankingCategory, RankingPlayer[]> = {
  'mens-singles': menSeniorRankings,
  'womens-singles': womenSeniorRankings,
  'juniors': juniorsRankings,
  'madalas': madalasRankings,
}

const categories = [
  { id: 'mens-singles', label: "Men's Singles" },
  { id: 'womens-singles', label: "Women's Singles" },
  { id: 'juniors', label: 'Juniors' },
  { id: 'madalas', label: 'Madalas' },
] as const

export function Rankings() {
  const [activeCategory, setActiveCategory] = useState<RankingCategory>('mens-singles')

  const currentRankings = rankingsData[activeCategory]

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

          {/* Rankings Table */}
          <Card>
            <CardContent className="p-0">
              {currentRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Rank
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                          Club
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">
                          Total Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {currentRankings.map((player, index) => (
                        <tr
                          key={`${player.rank}-${index}`}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {player.rank <= 3 && (
                                <Badge
                                  variant={
                                    player.rank === 1
                                      ? 'default'
                                      : player.rank === 2
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                >
                                  #{player.rank}
                                </Badge>
                              )}
                              {player.rank > 3 && (
                                <span className="text-sm font-medium text-muted-foreground">
                                  #{player.rank}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-foreground">
                              {player.name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-muted-foreground">
                              {player.club || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-foreground">
                              {player.totalPoints}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  Rankings for this category will be available soon
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rankings Info */}
          <div className="mt-8 bg-muted/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Rankings Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="mb-2">
                  • Rankings are updated bi-monthly based on tournament performance
                </p>
                <p className="mb-2">
                  • Points are awarded based on tournament level and placement
                </p>
              </div>
              <div>
                <p className="mb-2">
                  • Only ZTA sanctioned tournaments count towards rankings
                </p>
                <p className="mb-2">
                  • Top 12 tournament results count for final ranking
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
