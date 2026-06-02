import { useAuth } from '../contexts/AuthContext.jsx';
import { useEb } from './contexts/EbContext.jsx';
import { Login } from './components/Login.jsx';
import { NoAccess } from './components/NoAccess.jsx';
import { BackofficeShell } from './components/BackofficeShell.jsx';

export function BackofficeApp() {
  const { user, loading: authLoading } = useAuth();
  const { isStaff, loading: ebLoading } = useEb();

  if (authLoading || (user && ebLoading)) {
    return <div className="eb-boot"><div className="spinner" /></div>;
  }
  if (!user) return <Login />;
  if (!isStaff) return <NoAccess />;
  return <BackofficeShell />;
}
