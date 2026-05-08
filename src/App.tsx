import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LoginScreen } from './components/LoginScreen'
import { Dashboard } from './components/Dashboard'
import { MembersPage } from './components/members/MembersPage'
import { Layout } from './components/layout/Layout'
import { TasksPage } from './pages/TasksPage'
import { LinksPage } from './pages/LinksPage'
import { SpeakersPage } from './pages/SpeakersPage'
import { BirthdaysPage } from './pages/BirthdaysPage'
import { EventsPage } from './pages/EventsPage'
import { ThemeProvider } from './context/ThemeContext'
import { UserProfileProvider } from './context/UserProfileContext'
import { AuthRedirector } from './context/AuthRedirector'
import { DepartmentsPage } from './pages/DepartmentsPage'
import { AreasPage } from './pages/AreasPage'

import { ProjectsPage } from './pages/ProjectsPage'

function App() {

  return (
    <ThemeProvider>
      <UserProfileProvider>
        <BrowserRouter>
          <AuthRedirector />
          <Routes>
            <Route path="/" element={<LoginScreen />} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/uyeler" element={<Layout><MembersPage /></Layout>} />

            <Route path="/organizasyon/bolumler" element={<Layout><DepartmentsPage /></Layout>} />
            <Route path="/organizasyon/bolum/:deptId/alanlar" element={<Layout><AreasPage /></Layout>} />
            <Route path="/organizasyon/alan/:areaId/projeler" element={<Layout><ProjectsPage /></Layout>} />

            <Route path="/dogum-gunleri" element={<Layout><BirthdaysPage /></Layout>} />
            <Route path="/gorev-zinciri" element={<Layout><TasksPage /></Layout>} />
            <Route path="/linkler" element={<Layout><LinksPage /></Layout>} />
            <Route path="/konusmacilar" element={<Layout><SpeakersPage /></Layout>} />
            <Route path="/etkinlikler" element={<Layout><EventsPage /></Layout>} />
            <Route path="/ayarlar" element={<Layout><Dashboard /></Layout>} />
          </Routes>
        </BrowserRouter>
      </UserProfileProvider>
    </ThemeProvider>
  )
}

export default App

