import { AuthProvider, useAuthContext } from './components/AuthProvider';
import { MiniAppAuth } from './components/MiniAppAuth';
import { BrowserAuth } from './components/BrowserAuth';
import { UserProfile } from './components/UserProfile';

function AppContent() {
  const { user, isLoading, error, isAuthenticated } = useAuthContext();

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Ошибка авторизации</p>
        <p>{error}</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <BrowserAuth />;
  }

  return <UserProfile user={user} />;
}

function App() {
  return (
    <AuthProvider>
      <MiniAppAuth />
      <AppContent />
    </AuthProvider>
  );
}

export default App;