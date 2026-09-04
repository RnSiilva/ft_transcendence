/* ProtectedRoute.tsx
   While checking if user is logged in, show a clean loading spinner.
   Redirects to /login if not authenticated.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading" aria-label="Checking session…">
        <div className="auth-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
