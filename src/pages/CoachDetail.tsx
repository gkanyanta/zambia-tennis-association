import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Award,
  Briefcase,
  Globe,
  Calendar,
  CheckCircle
} from 'lucide-react'
import { coachService, type CoachWithHistory } from '@/services/coachService'

export function CoachDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [coach, setCoach] = useState<CoachWithHistory | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchCoach(id)
    }
  }, [id])

  const fetchCoach = async (coachId: string) => {
    try {
      setLoading(true)
      const data = await coachService.getCoach(coachId)
      setCoach(data)
    } catch (err: any) {
      console.error('Failed to load coach:', err)
      alert('Failed to load coach details')
      navigate('/coaches')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Hero title="Coach Profile" description="Loading..." gradient />
        <section className="py-16">
          <div className="container-custom text-center">
            <p className="text-muted-foreground">Loading coach details...</p>
          </div>
        </section>
      </div>
    )
  }

  if (!coach) {
    return null
  }

  return (
    <div className="flex flex-col">
      <Hero
        title={coach.fullName || `${coach.firstName} ${coach.lastName}`}
        description={coach.itfLevel}
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-4xl">
          <Button
            variant="outline"
            className="mb-6"
            onClick={() => navigate('/coaches')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Coaches
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  {coach.bio ? (
                    <p className="text-muted-foreground">{coach.bio}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No biography available</p>
                  )}
                </CardContent>
              </Card>

              {/* Experience & Qualifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Experience & Qualifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">Experience</div>
                      <div className="text-sm text-muted-foreground">{coach.experience} years</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">ITF Level</div>
                      <div className="text-sm text-muted-foreground">{coach.itfLevel}</div>
                    </div>
                  </div>

                  {coach.languages && coach.languages.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">Languages</div>
                        <div className="text-sm text-muted-foreground">{coach.languages.join(', ')}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Specializations */}
              {coach.specializations && coach.specializations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Specializations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {coach.specializations.map((spec, idx) => (
                        <Badge key={idx} variant="secondary">{spec}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Certifications */}
              {coach.certifications && coach.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Certifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {coach.certifications.map((cert, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">{cert.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {cert.issuedBy}
                              {cert.dateObtained && (
                                <> • Obtained: {new Date(cert.dateObtained).toLocaleDateString()}</>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Image */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-border">
                      {coach.profileImage ? (
                        <img
                          src={coach.profileImage}
                          alt={`${coach.firstName} ${coach.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <Award className="h-16 w-16 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{coach.club.name}</span>
                    </div>
                    {coach.club.city && (
                      <div className="text-sm text-muted-foreground ml-6">
                        {coach.club.city}{coach.club.province && `, ${coach.club.province}`}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {coach.preferredContactMethod !== 'phone' && (
                    <Button
                      className="w-full"
                      variant="default"
                      onClick={() => window.location.href = `mailto:${coach.email}`}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email Coach
                    </Button>
                  )}

                  {coach.preferredContactMethod !== 'email' && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => window.location.href = `tel:${coach.phone}`}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Coach
                    </Button>
                  )}

                  {coach.preferredContactMethod === 'both' && (
                    <p className="text-xs text-center text-muted-foreground">
                      Coach accepts contact via email or phone
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Availability */}
              <Card>
                <CardHeader>
                  <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${coach.availableForBooking ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm">
                      {coach.availableForBooking ? 'Available for booking' : 'Not currently available'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Listing Status */}
              {coach.listingExpiryDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Listing Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Listed until {new Date(coach.listingExpiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
