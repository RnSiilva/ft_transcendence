import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './i18n/LanguageContext'
import StarField from './components/StarField'
import LanguageBar from './components/LanguageBar'
import Header from './components/Header'
import Footer from './components/Footer'
import CookieBanner from './components/CookieBanner'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Game from './pages/Game'
import Rules from './pages/Rules'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import About from './pages/About'
import Rooms from './pages/Rooms'
import PublicProfile from './pages/PublicProfile'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <StarField />
        <LanguageBar />
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/game" element={<Game />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rooms"
              element={
                <ProtectedRoute>
                  <Rooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/:username"
              element={
                <ProtectedRoute>
                  <PublicProfile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
        <CookieBanner />
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
