import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import CookieBanner from './components/CookieBanner'
import Home from './pages/Home'
import Login from './pages/Login'
import Perfil from './pages/Perfil'
import Jogo from './pages/Jogo'
import Regras from './pages/Regras'
import Privacidade from './pages/Privacidade'
import Termos from './pages/Termos'

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/jogo" element={<Jogo />} />
        <Route path="/regras" element={<Regras />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/termos" element={<Termos />} />
      </Routes>
      <Footer />
      <CookieBanner />
    </BrowserRouter>
  )
}

export default App
