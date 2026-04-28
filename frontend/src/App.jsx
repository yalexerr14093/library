import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import Navbar from './components/Navbar.jsx'
import Toast from './components/Toast.jsx'
import CatalogPage from './pages/CatalogPage.jsx'
import MyBooksPage from './pages/MyBooksPage.jsx'
import WishlistPage from './pages/WishlistPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import UserProfilePage from './pages/UserProfilePage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AdminReviewsPage from './pages/AdminReviewsPage.jsx'
import AdminAnalyticsPage from './pages/AdminAnalyticsPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Navbar />
        <Toast />
        <Routes>
          <Route path="/"          element={<CatalogPage />} />
          <Route path="/catalog"   element={<Navigate to="/" replace />} />
          <Route path="/my-books"  element={<ProtectedRoute><MyBooksPage /></ProtectedRoute>} />
          <Route path="/wishlist"  element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/users/:id" element={<UserProfilePage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/admin/reviews" element={<ProtectedRoute><AdminReviewsPage /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalyticsPage /></ProtectedRoute>} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
