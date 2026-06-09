import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Завантаження...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}