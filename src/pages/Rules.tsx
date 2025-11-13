import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, BookOpen, FileText, Scale } from 'lucide-react'

const documents = [
  {
    icon: BookOpen,
    title: 'Official Rules of Tennis',
    description: 'ITF Rules of Tennis (current edition)',
    size: '2.5 MB',
    type: 'PDF',
  },
  {
    icon: FileText,
    title: 'ZTA Tournament Regulations',
    description: 'Regulations for ZTA sanctioned tournaments',
    size: '1.8 MB',
    type: 'PDF',
  },
  {
    icon: Scale,
    title: 'Code of Conduct',
    description: 'Player and official code of conduct',
    size: '850 KB',
    type: 'PDF',
  },
  {
    icon: FileText,
    title: 'Anti-Doping Policy',
    description: 'ZTA anti-doping regulations and procedures',
    size: '1.2 MB',
    type: 'PDF',
  },
]

export function Rules() {
  return (
    <div className="flex flex-col">
      <Hero
        title="Rules & Regulations"
        description="Official tennis rules, tournament regulations, and ZTA policies"
        gradient
      />

      <section className="py-16">
        <div className="container-custom">
          {/* Documents */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8">
              Official Documents
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documents.map((doc, index) => (
                <Card key={index} className="card-elevated-hover">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <doc.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="mb-2">{doc.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mb-2">
                          {doc.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{doc.type}</span>
                          <span>•</span>
                          <span>{doc.size}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Reference */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Scoring System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Points:</strong> Love (0), 15, 30, 40, Game</p>
                <p><strong>Deuce:</strong> When both players reach 40-40</p>
                <p><strong>Advantage:</strong> One point ahead after deuce</p>
                <p><strong>Game:</strong> First to win 4 points with 2-point margin</p>
                <p><strong>Set:</strong> First to win 6 games with 2-game margin</p>
                <p><strong>Match:</strong> Best of 3 or 5 sets</p>
                <p><strong>Tiebreak:</strong> At 6-6 in most sets</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Basic Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>• Server must stand behind baseline</p>
                <p>• Ball must land in diagonal service box</p>
                <p>• Two serves allowed per point</p>
                <p>• Ball must bounce once before return</p>
                <p>• Players alternate sides after odd games</p>
                <p>• Let called for service interference</p>
                <p>• Ball hitting line is considered in</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Court Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Singles:</strong> 78 ft × 27 ft (23.77m × 8.23m)</p>
                <p><strong>Doubles:</strong> 78 ft × 36 ft (23.77m × 10.97m)</p>
                <p><strong>Net Height:</strong> 3 ft (0.914m) at center</p>
                <p><strong>Service Box:</strong> 21 ft × 13.5 ft</p>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Equipment Standards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Racquet:</strong> Maximum 29 inches length</p>
                <p><strong>Ball:</strong> ITF approved tennis balls</p>
                <p><strong>Ball Color:</strong> White or yellow</p>
                <p><strong>Ball Weight:</strong> 56.0-59.4 grams</p>
                <p><strong>Ball Diameter:</strong> 6.54-6.86 cm</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
