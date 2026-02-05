import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hero } from '@/components/Hero'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  User, Shield, Upload, CheckCircle2, CreditCard,
  Clock, ArrowRight, ArrowLeft, Loader2, FileText, X, AlertCircle
} from 'lucide-react'
import { clubService, type Club } from '@/services/clubService'
import { playerRegistrationService, type RegistrationSubmitData } from '@/services/playerRegistrationService'
import { uploadDocument } from '@/services/api'
import { initializeLencoWidget } from '@/utils/lencoWidget'

type Step = 1 | 2 | 3

export function RegisterPlayer() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [clubs, setClubs] = useState<Club[]>([])
  const [clubSearch, setClubSearch] = useState('')
  const [showClubDropdown, setShowClubDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resultRef, setResultRef] = useState('')
  const [resultAmount, setResultAmount] = useState(0)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<RegistrationSubmitData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    club: '',
    isInternational: false,
    parentGuardianName: '',
    parentGuardianPhone: '',
    parentGuardianEmail: '',
  })

  const [proofDoc, setProofDoc] = useState<{
    url: string; publicId: string; originalName: string; fileType: string;
  } | null>(null)

  useEffect(() => {
    clubService.getClubs().then(setClubs).catch(() => {})
  }, [])

  const age = useMemo(() => {
    if (!formData.dateOfBirth) return null
    const birth = new Date(formData.dateOfBirth)
    const today = new Date()
    return Math.floor((today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }, [formData.dateOfBirth])

  const isJunior = age !== null && age < 18
  const needsStep2 = isJunior

  const membershipLabel = useMemo(() => {
    if (formData.isInternational) return 'International ZPIN (K500)'
    if (age === null) return ''
    return age < 18 ? 'Junior ZPIN (K100)' : 'Senior ZPIN (K250)'
  }, [age, formData.isInternational])

  const filteredClubs = useMemo(() => {
    if (!clubSearch) return clubs
    return clubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase()))
  }, [clubs, clubSearch])

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleClubSelect = (clubName: string) => {
    updateField('club', clubName)
    setClubSearch(clubName)
    setShowClubDropdown(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size must be under 10MB')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, PNG, and PDF files are allowed')
      return
    }

    try {
      setUploading(true)
      setError('')
      const result = await uploadDocument(file)
      setProofDoc(result.data)
    } catch (err: any) {
      setError(err.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.gender || !formData.phone) {
      setError('Please fill in all required fields')
      return false
    }
    if (age !== null && (age < 3 || age > 100)) {
      setError('Please enter a valid date of birth')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (isJunior) {
      if (!formData.parentGuardianName || !formData.parentGuardianPhone) {
        setError('Parent/guardian name and phone are required for players under 18')
        return false
      }
      if (!proofDoc) {
        setError('Proof of age document is required for players under 18')
        return false
      }
    }
    return true
  }

  const goNext = () => {
    setError('')
    if (step === 1) {
      if (!validateStep1()) return
      if (needsStep2) {
        setStep(2)
      } else {
        setStep(3)
      }
    } else if (step === 2) {
      if (!validateStep2()) return
      setStep(3)
    }
  }

  const goBack = () => {
    setError('')
    if (step === 3) {
      setStep(needsStep2 ? 2 : 1)
    } else if (step === 2) {
      setStep(1)
    }
  }

  const buildSubmitData = (): RegistrationSubmitData => {
    const data: RegistrationSubmitData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      phone: formData.phone.trim(),
      email: formData.email?.trim() || undefined,
      club: formData.club || undefined,
      isInternational: formData.isInternational || false,
    }
    if (isJunior) {
      data.parentGuardianName = formData.parentGuardianName
      data.parentGuardianPhone = formData.parentGuardianPhone
      data.parentGuardianEmail = formData.parentGuardianEmail || undefined
      if (proofDoc) {
        data.proofOfAgeDocument = proofDoc
      }
    }
    return data
  }

  const handlePayLater = async () => {
    try {
      setLoading(true)
      setError('')
      const data = buildSubmitData()
      const result = await playerRegistrationService.submitRegistration(data)
      setResultRef(result.referenceNumber)
      setResultAmount(result.amount)
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration')
    } finally {
      setLoading(false)
    }
  }

  const handlePayNow = async () => {
    if (!formData.email) {
      setError('Email is required for online payment')
      return
    }

    try {
      setLoading(true)
      setError('')
      const data = buildSubmitData()
      const result = await playerRegistrationService.submitAndPay(data)

      // Open Lenco widget
      await initializeLencoWidget({
        key: result.publicKey,
        reference: result.paymentReference,
        email: result.email,
        amount: result.amount,
        currency: 'ZMW',
        onSuccess: (response) => {
          navigate(`/payment/verify?reference=${response.reference}&type=registration`)
        },
        onClose: () => {
          // Payment widget closed - show the reference so they can pay later
          setResultRef(result.referenceNumber)
          setResultAmount(result.amount)
          setSubmitted(true)
        },
        onConfirmationPending: () => {
          navigate(`/payment/verify?reference=${result.paymentReference}&type=registration&pending=true`)
        }
      })
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  // Success screen after pay-later submission
  if (submitted) {
    return (
      <div className="flex flex-col">
        <Hero title="Registration Submitted" description="Your application has been received" gradient />
        <section className="py-16">
          <div className="container-custom max-w-lg">
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Application Received!</h3>
                <p className="text-muted-foreground mb-6">
                  Your registration is pending payment. Use the reference number below to complete payment.
                </p>

                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-6 text-left space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference Number</p>
                    <p className="font-mono font-bold text-lg">{resultRef}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount Due</p>
                    <p className="font-bold">K{resultAmount}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                  Save your reference number. You can return to pay at any time.
                </p>

                <div className="flex flex-col gap-3">
                  <Button onClick={() => navigate(`/register-player/pay`)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    Go Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Hero
        title="Player Registration"
        description="Register for your ZPIN and join the Zambia Tennis Association"
        gradient
      />

      <section className="py-16">
        <div className="container-custom max-w-2xl">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => {
              if (s === 2 && !needsStep2) return null
              const isActive = s === step
              const isComplete = s < step || (s === 2 && step === 3 && !needsStep2)
              return (
                <div key={s} className="flex items-center gap-2">
                  {s > 1 && !(s === 2 && !needsStep2) && (
                    <div className={`w-8 h-0.5 ${isComplete || isActive ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive ? 'bg-primary text-white' :
                    isComplete ? 'bg-primary/20 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {isComplete ? '✓' : s === 2 && !needsStep2 ? '' : s}
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="Enter last name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth">
                      Date of Birth *
                      {age !== null && (
                        <span className="text-muted-foreground ml-2">(Age: {age})</span>
                      )}
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => updateField('dateOfBirth', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                    {membershipLabel && (
                      <p className="text-xs text-primary mt-1 font-medium">{membershipLabel}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => updateField('gender', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="e.g. 0971234567"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="your@email.com"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for online payment
                    </p>
                  </div>

                  <div className="relative">
                    <Label htmlFor="club">Club</Label>
                    <Input
                      id="club"
                      value={clubSearch}
                      onChange={(e) => {
                        setClubSearch(e.target.value)
                        updateField('club', e.target.value)
                        setShowClubDropdown(true)
                      }}
                      onFocus={() => setShowClubDropdown(true)}
                      onBlur={() => setTimeout(() => setShowClubDropdown(false), 200)}
                      placeholder="Search for club..."
                      autoComplete="off"
                    />
                    {showClubDropdown && filteredClubs.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredClubs.map(club => (
                          <button
                            key={club._id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onMouseDown={() => handleClubSelect(club.name)}
                          >
                            {club.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isInternational"
                      checked={formData.isInternational || false}
                      onChange={(e) => updateField('isInternational', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isInternational" className="mb-0 cursor-pointer">
                      International Player
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={goNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Guardian Info + Proof of Age (juniors only) */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Guardian Information & Proof of Age
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Since the player is under 18, parent/guardian details and proof of age are required.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardianName">Parent/Guardian Name *</Label>
                    <Input
                      id="guardianName"
                      value={formData.parentGuardianName}
                      onChange={(e) => updateField('parentGuardianName', e.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardianPhone">Parent/Guardian Phone *</Label>
                    <Input
                      id="guardianPhone"
                      value={formData.parentGuardianPhone}
                      onChange={(e) => updateField('parentGuardianPhone', e.target.value)}
                      placeholder="e.g. 0971234567"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="guardianEmail">Parent/Guardian Email</Label>
                    <Input
                      id="guardianEmail"
                      type="email"
                      value={formData.parentGuardianEmail}
                      onChange={(e) => updateField('parentGuardianEmail', e.target.value)}
                      placeholder="guardian@email.com"
                    />
                  </div>
                </div>

                {/* Proof of Age Upload */}
                <div className="pt-4 border-t">
                  <Label>Proof of Age Document *</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Upload a birth certificate, passport, or NRC. Accepted formats: JPG, PNG, PDF (max 10MB)
                  </p>

                  {proofDoc ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg">
                      {proofDoc.fileType === 'pdf' ? (
                        <FileText className="h-8 w-8 text-red-500" />
                      ) : (
                        <img src={proofDoc.url} alt="Preview" className="h-16 w-16 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{proofDoc.originalName}</p>
                        <p className="text-xs text-green-600">Uploaded successfully</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProofDoc(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        )}
                        <p className="text-sm text-muted-foreground">
                          {uploading ? 'Uploading...' : 'Click to upload document'}
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={goBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={goNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Summary & Submit */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Review & Submit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">
                        {new Date(formData.dateOfBirth).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                        {age !== null && <span className="text-muted-foreground"> (Age: {age})</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">{formData.gender}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{formData.phone}</p>
                    </div>
                    {formData.email && (
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{formData.email}</p>
                      </div>
                    )}
                    {formData.club && (
                      <div>
                        <p className="text-muted-foreground">Club</p>
                        <p className="font-medium">{formData.club}</p>
                      </div>
                    )}
                    {formData.isInternational && (
                      <div>
                        <p className="text-muted-foreground">International</p>
                        <Badge variant="outline">Yes</Badge>
                      </div>
                    )}
                  </div>

                  {isJunior && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold mb-3">Guardian Details</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Guardian Name</p>
                          <p className="font-medium">{formData.parentGuardianName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Guardian Phone</p>
                          <p className="font-medium">{formData.parentGuardianPhone}</p>
                        </div>
                        {formData.parentGuardianEmail && (
                          <div>
                            <p className="text-muted-foreground">Guardian Email</p>
                            <p className="font-medium">{formData.parentGuardianEmail}</p>
                          </div>
                        )}
                      </div>
                      {proofDoc && (
                        <div className="mt-3">
                          <p className="text-muted-foreground text-sm">Proof of Age</p>
                          <p className="text-sm font-medium">{proofDoc.originalName}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Membership Type & Amount */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                      <div>
                        <p className="font-semibold">{membershipLabel?.split(' (')[0]}</p>
                        <p className="text-sm text-muted-foreground">Annual ZPIN Registration</p>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        K{formData.isInternational ? '500' : (age !== null && age < 18 ? '100' : '250')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-4 border-t">
                  <Button
                    onClick={handlePayNow}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Submit & Pay Now
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handlePayLater}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    Submit & Pay Later
                  </Button>

                  <Button variant="ghost" onClick={goBack} disabled={loading}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Edit
                  </Button>
                </div>

                {!formData.email && (
                  <p className="text-xs text-amber-600 text-center">
                    Note: Email is required for online payment. Go back and add your email to pay online.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Secure payment powered by Lenco
            </p>
            <div className="flex items-center justify-center gap-3 text-muted-foreground flex-wrap">
              <Badge variant="outline">Visa/Mastercard</Badge>
              <Badge variant="outline">MTN Mobile Money</Badge>
              <Badge variant="outline">Airtel Money</Badge>
              <Badge variant="outline">Zamtel Kwacha</Badge>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
