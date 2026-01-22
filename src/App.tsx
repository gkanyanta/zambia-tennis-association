import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { usePageTracking } from '@/hooks/usePageTracking'

// Component to track page views
function PageTracker() {
  usePageTracking();
  return null;
}
import { Home } from '@/pages/Home'
import { News } from '@/pages/News'
import { NewsDetail } from '@/pages/NewsDetail'
import { Membership } from '@/pages/Membership'
import { Tournaments } from '@/pages/Tournaments'
import { TournamentDetail } from '@/pages/TournamentDetail'
import { Rankings } from '@/pages/Rankings'
import { Play } from '@/pages/Play'
import { Calendar } from '@/pages/Calendar'
import { Juniors } from '@/pages/Juniors'
import { Madalas } from '@/pages/Madalas'
import { Coaches } from '@/pages/Coaches'
import { CoachDetail } from '@/pages/CoachDetail'
import { CoachManagement } from '@/pages/CoachManagement'
import { CoachListingSettings } from '@/pages/CoachListingSettings'
import { Gallery } from '@/pages/Gallery'
import { GalleryAdmin } from '@/pages/GalleryAdmin'
import { Leagues } from '@/pages/Leagues'
import FixtureScoreEntry from '@/components/leagues/FixtureScoreEntry'
import { Players } from '@/pages/Players'
import { Clubs } from '@/pages/Clubs'
import { Transformation } from '@/pages/Transformation'
import { Rules } from '@/pages/Rules'
import { About } from '@/pages/About'
import { Contact } from '@/pages/Contact'
import { Donate } from '@/pages/Donate'
import { DonateVerify } from '@/pages/DonateVerify'
import { MembershipPayment } from '@/pages/MembershipPayment'
import { ZPINPayment } from '@/pages/ZPINPayment'
import { ClubAffiliationPayment } from '@/pages/ClubAffiliationPayment'
import { PaymentVerify } from '@/pages/PaymentVerify'
import { Sponsors } from '@/pages/Sponsors'
import { Privacy } from '@/pages/Privacy'
import { Terms } from '@/pages/Terms'
import { NotFound } from '@/pages/NotFound'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Admin } from '@/pages/Admin'
import { TournamentAdmin } from '@/pages/TournamentAdmin'
import { TournamentCreate } from '@/pages/TournamentCreate'
import { TournamentRegister } from '@/pages/TournamentRegister'
import { UserManagement } from '@/pages/UserManagement'
import { ClubManagement } from '@/pages/ClubManagement'
import { PlayerManagement } from '@/pages/PlayerManagement'
import { RankingsImport } from '@/pages/RankingsImport'
import { ExecutiveMembersManagement } from '@/pages/ExecutiveMembersManagement'
import { AffiliationsManagement } from '@/pages/AffiliationsManagement'
import { AboutContentEditor } from '@/pages/AboutContentEditor'
import { LeagueManagement } from '@/pages/LeagueManagement'
import { CalendarManagement } from '@/pages/CalendarManagement'
import { MembershipAdmin } from '@/pages/MembershipAdmin'
import { TrafficStats } from '@/pages/TrafficStats'

function App() {
  return (
    <Router>
      <AuthProvider>
        <PageTracker />
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/players" element={<PlayerManagement />} />
              <Route path="/admin/clubs" element={<ClubManagement />} />
              <Route path="/admin/coaches" element={<CoachManagement />} />
              <Route path="/admin/coach-settings" element={<CoachListingSettings />} />
              <Route path="/admin/tournaments" element={<TournamentAdmin />} />
              <Route path="/admin/tournaments/create" element={<TournamentCreate />} />
              <Route path="/admin/tournaments/:tournamentId" element={<TournamentAdmin />} />
              <Route path="/admin/rankings/import" element={<RankingsImport />} />
              <Route path="/admin/executive-members" element={<ExecutiveMembersManagement />} />
              <Route path="/admin/affiliations" element={<AffiliationsManagement />} />
              <Route path="/admin/about-content" element={<AboutContentEditor />} />
              <Route path="/admin/leagues" element={<LeagueManagement />} />
              <Route path="/admin/calendar" element={<CalendarManagement />} />
              <Route path="/admin/membership" element={<MembershipAdmin />} />
              <Route path="/admin/traffic" element={<TrafficStats />} />
              <Route path="/news/:id" element={<NewsDetail />} />
              <Route path="/news" element={<News />} />
              <Route path="/leagues" element={<Leagues />} />
              <Route path="/leagues/:leagueId/fixtures/:fixtureId/score" element={<FixtureScoreEntry />} />
              <Route path="/players" element={<Players />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/membership" element={<Membership />} />
              <Route path="/membership/pay" element={<MembershipPayment />} />
              <Route path="/register-zpin" element={<ZPINPayment />} />
              <Route path="/club-affiliation" element={<ClubAffiliationPayment />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/:id" element={<TournamentDetail />} />
              <Route path="/tournaments/:id/register" element={<TournamentRegister />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/play" element={<Play />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/juniors" element={<Juniors />} />
              <Route path="/madalas" element={<Madalas />} />
              <Route path="/coaches" element={<Coaches />} />
              <Route path="/coaches/:id" element={<CoachDetail />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/manage" element={<GalleryAdmin />} />
              <Route path="/transformation" element={<Transformation />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/donate" element={<Donate />} />
              <Route path="/donate/verify" element={<DonateVerify />} />
              <Route path="/payment/verify" element={<PaymentVerify />} />
              <Route path="/sponsors" element={<Sponsors />} />
              <Route path="/partnerships" element={<Sponsors />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
