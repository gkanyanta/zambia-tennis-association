import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Home } from '@/pages/Home'
import { News } from '@/pages/News'
import { Membership } from '@/pages/Membership'
import { Tournaments } from '@/pages/Tournaments'
import { Rankings } from '@/pages/Rankings'
import { Play } from '@/pages/Play'
import { Calendar } from '@/pages/Calendar'
import { Juniors } from '@/pages/Juniors'
import { Madalas } from '@/pages/Madalas'
import { Coaches } from '@/pages/Coaches'
import { Gallery } from '@/pages/Gallery'
import { GalleryAdmin } from '@/pages/GalleryAdmin'
import { Leagues } from '@/pages/Leagues'
import { Players } from '@/pages/Players'
import { Clubs } from '@/pages/Clubs'
import { Transformation } from '@/pages/Transformation'
import { Rules } from '@/pages/Rules'
import { About } from '@/pages/About'
import { Contact } from '@/pages/Contact'
import { Privacy } from '@/pages/Privacy'
import { Terms } from '@/pages/Terms'
import { NotFound } from '@/pages/NotFound'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Admin } from '@/pages/Admin'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/news" element={<News />} />
              <Route path="/leagues" element={<Leagues />} />
              <Route path="/players" element={<Players />} />
              <Route path="/clubs" element={<Clubs />} />
              <Route path="/membership" element={<Membership />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/play" element={<Play />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/juniors" element={<Juniors />} />
              <Route path="/madalas" element={<Madalas />} />
              <Route path="/coaches" element={<Coaches />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/manage" element={<GalleryAdmin />} />
              <Route path="/transformation" element={<Transformation />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
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
