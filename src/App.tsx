import { Route, Routes, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AdminLayout from './routes/admin/AdminLayout';
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
import GuestsEditor from './routes/app/weddings/GuestsEditor';
import TablesEditor from './routes/app/weddings/TablesEditor';
import ResponsesEditor from './routes/app/weddings/ResponsesEditor';
import GalleryModerationEditor from './routes/app/weddings/GalleryModerationEditor';
import SitePreview from './routes/app/weddings/SitePreview';
import WeddingPublic from './routes/w/WeddingPublic';
import GalleryPage from './routes/w/GalleryPage';
import NotFound from './pages/NotFound';

/**
 * Routage applicatif.
 *  /          → page d'accueil publique
 *  /login     → portail de connexion unique (admin + clients)
 *  /admin     → panel super-admin (auth requise)
 *  /app       → panel client (auth requise)
 *  /w/:slug   → site public du mariage
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/app/login" element={<Navigate to="/login" replace />} />
      <Route path="/w/:slug" element={<WeddingPublic />} />
      <Route path="/w/:slug/galerie" element={<GalleryPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
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
          <Route path="invites" element={<GuestsEditor />} />
          <Route path="tables" element={<TablesEditor />} />
          <Route path="reponses" element={<ResponsesEditor />} />
          <Route path="galerie" element={<GalleryModerationEditor />} />
          <Route path="apercu" element={<SitePreview />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}