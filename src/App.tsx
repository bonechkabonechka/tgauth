import { AuthProvider, useAuthContext } from './components/AuthProvider';
import { MiniAppAuth } from './components/MiniAppAuth';
import { BrowserAuth } from './components/BrowserAuth';
import { UserProfile } from './components/UserProfile';

function AppContent() {
  const { user, isLoading, error, isAuthenticated } = useAuthContext();
  const tg = window.Telegram?.WebApp;
  const theme = tg?.themeParams;

  // Получаем цвета темы
  const textColor = theme?.text_color || '#000000';
  const bgColor = theme?.bg_color || '#ffffff';
  const hintColor = theme?.hint_color || '#999999';

  // Состояние загрузки
  if (isLoading) {
    return (
      <div style={{ 
        color: textColor, 
        backgroundColor: bgColor,
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${hintColor}20`,
            borderTop: `4px solid ${theme?.link_color || '#2481cc'}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: hintColor }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  // Состояние ошибки
  if (error) {
    return (
      <div style={{ 
        color: textColor, 
        backgroundColor: bgColor,
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#d32f2f', fontSize: '18px', marginBottom: '10px' }}>
            ❌ Ошибка авторизации
          </p>
          <p style={{ color: hintColor, fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    );
  }

  // Пользователь не авторизован - всегда показываем кнопку входа
  if (!isAuthenticated || !user) {
    return <BrowserAuth />;
  }

  // Пользователь авторизован - показываем профиль
  return <UserProfile user={user} theme={theme} />;
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