import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
const Login = lazy(() => import('./pages/Login'));
const AdminLayout = lazy(() => import('./routes/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./routes/admin/AdminDashboard'));
const WeddingsList = lazy(() => import('./routes/admin/weddings/WeddingsList'));
const WeddingForm = lazy(() => import('./routes/admin/weddings/WeddingForm'));
const WeddingDetail = lazy(() => import('./routes/admin/weddings/WeddingDetail'));
const AdminWeddingConfigLayout = lazy(() => import('./routes/admin/weddings/WeddingConfigLayout'));
const SectionsEditor = lazy(() => import('./routes/app/weddings/SectionsEditor'));
const ThemeEditor = lazy(() => import('./routes/app/weddings/ThemeEditor'));
const ProgramEditor = lazy(() => import('./routes/app/weddings/ProgramEditor'));
const CheckIn = lazy(() => import('./routes/admin/weddings/CheckIn'));
const AppLayout = lazy(() => import('./routes/app/AppLayout'));
const ClientDashboard = lazy(() => import('./routes/app/ClientDashboard'));
const WeddingConfigLayout = lazy(() => import('./routes/app/weddings/WeddingConfigLayout'));
const GuestsEditor = lazy(() => import('./routes/app/weddings/GuestsEditor'));
const ShareLinksEditor = lazy(() => import('./routes/app/weddings/ShareLinksEditor'));
const TablesEditor = lazy(() => import('./routes/app/weddings/TablesEditor'));
const ResponsesEditor = lazy(() => import('./routes/app/weddings/ResponsesEditor'));
const GalleryModerationEditor = lazy(() => import('./routes/app/weddings/GalleryModerationEditor'));
const SitePreview = lazy(() => import('./routes/app/weddings/SitePreview'));
const AppCheckIn = lazy(() => import('./routes/app/weddings/CheckIn'));
import WeddingPublic from './routes/w/WeddingPublic';
const GalleryPage = lazy(() => import('./routes/w/GalleryPage'));
const TestimonialsPage = lazy(() => import('./routes/w/TestimonialsPage'));
import NotFound from './pages/NotFound';

/**
 * Routage applicatif.
 *  /          → page d'accueil publique
 *  /login     → portail de connexion unique (admin + clients)
 *  /admin     → panel super-admin (auth requise)
 *  /app       → panel client (auth requise)
 *  /w/:slug   → site public du mariage
 *
 * Performance : seuls l'accueil et le site public d'un mariage sont dans le
 * paquet initial ; l'administration, l'espace client, la galerie… sont
 * chargés à la demande (les invités ne téléchargent jamais le code admin).
 */
/** Écran d'attente pendant le chargement d'un module (admin, galerie…). */
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" aria-label="Chargement" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/app/login" element={<Navigate to="/login" replace />} />
      <Route path="/w/:slug" element={<WeddingPublic />} />
      <Route path="/w/:slug/galerie" element={<GalleryPage />} />
      <Route path="/w/:slug/temoignages" element={<TestimonialsPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="weddings" element={<WeddingsList />} />
        <Route path="weddings/new" element={<WeddingForm />} />
        <Route path="weddings/:id" element={<WeddingDetail />} />
        <Route path="weddings/:id/edit" element={<WeddingForm />} />
        <Route path="weddings/:id/checkin" element={<CheckIn />} />
        <Route path="weddings/:id/config" element={<AdminWeddingConfigLayout />}>
          <Route path="sections" element={<SectionsEditor />} />
          <Route path="theme" element={<ThemeEditor />} />
          <Route path="programme" element={<ProgramEditor />} />
          <Route path="invites" element={<GuestsEditor />} />
          <Route path="partage" element={<ShareLinksEditor />} />
          <Route path="tables" element={<TablesEditor />} />
          <Route path="apercu" element={<SitePreview />} />
        </Route>
      </Route>

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<ClientDashboard />} />
        <Route path=":weddingId" element={<WeddingConfigLayout />}>
          <Route path="invites" element={<GuestsEditor />} />
          <Route path="partage" element={<ShareLinksEditor />} />
          <Route path="tables" element={<TablesEditor />} />
          <Route path="reponses" element={<ResponsesEditor />} />
          <Route path="galerie" element={<GalleryModerationEditor />} />
          <Route path="apercu" element={<SitePreview />} />
          <Route path="checkin" element={<AppCheckIn />} />
          {/* Les sections ne sont plus éditables côté client (gérées par l'admin) :
              on redirige les anciens liens/marque-pages vers un onglet existant. */}
          <Route path="sections" element={<Navigate to="../apercu" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}