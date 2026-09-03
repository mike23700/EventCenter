import { Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminLayout from './routes/admin/AdminLayout';
import AdminLogin from './routes/admin/AdminLogin';
import AdminDashboard from './routes/admin/AdminDashboard';
import WeddingsList from './routes/admin/weddings/WeddingsList';
import WeddingForm from './routes/admin/weddings/WeddingForm';
import WeddingDetail from './routes/admin/weddings/WeddingDetail';
import AppLayout from './routes/app/AppLayout';
import ClientDashboard from './routes/app/ClientDashboard';
import WeddingConfigLayout from './routes/app/weddings/WeddingConfigLayout';
import SectionsEditor from './routes/app/weddings/SectionsEditor';
import ThemeEditor from './routes/app/weddings/ThemeEditor';
import ProgramEditor from './routes/app/weddings/ProgramEditor';
import WeddingPublic from './routes/w/WeddingPublic';
import NotFound from './pages/NotFound';

/**
 * Routage applicatif.
 *  /          → page d'accueil publique
 *  /admin     → panel super-admin (auth requise)
 *  /app       → panel client (phase 3+)
 *  /w/:slug   → site public du mariage
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/w/:slug" element={<WeddingPublic />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="login" element={<AdminLogin />} />
        <Route path="weddings" element={<WeddingsList />} />
        <Route path="weddings/new" element={<WeddingForm />} />
        <Route path="weddings/:id" element={<WeddingDetail />} />
        <Route path="weddings/:id/edit" element={<WeddingForm />} />
      </Route>

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<ClientDashboard />} />
        <Route path=":weddingId" element={<WeddingConfigLayout />}>
          <Route path="sections" element={<SectionsEditor />} />
          <Route path="theme" element={<ThemeEditor />} />
          <Route path="programme" element={<ProgramEditor />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}