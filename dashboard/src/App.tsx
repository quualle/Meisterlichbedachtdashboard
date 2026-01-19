import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Customers } from './pages/Customers'
import { Materials } from './pages/Materials'
import { Services } from './pages/Services'
import { Employees } from './pages/Employees'
import { Invoices } from './pages/Invoices'
import { Documents } from './pages/Documents'
import { Settings } from './pages/Settings'
import { Catalog } from './pages/Catalog'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="kunden" element={<Customers />} />
          <Route path="katalog" element={<Catalog />} />
          <Route path="material" element={<Materials />} />
          <Route path="dienstleistungen" element={<Services />} />
          <Route path="mitarbeiter" element={<Employees />} />
          <Route path="rechnungen" element={<Invoices />} />
          <Route path="dokumente" element={<Documents />} />
          <Route path="einstellungen" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
