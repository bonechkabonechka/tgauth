import type { User } from '../types/auth'; 

interface UserProfileProps {
  user: User;
  theme?: {
    text_color?: string;
    bg_color?: string;
    hint_color?: string;
    link_color?: string;
    secondary_bg_color?: string;
  };
}

export function UserProfile({ user, theme }: UserProfileProps) {
  const textColor = theme?.text_color || '#000000';
  const bgColor = theme?.bg_color || '#ffffff';
  const hintColor = theme?.hint_color || '#999999';
  const linkColor = theme?.link_color || '#2481cc';
  const secondaryBg = theme?.secondary_bg_color || '#f8f9fa';

  const getInitials = (firstName: string, lastName?: string) => {
    const first = firstName ? firstName[0].toUpperCase() : '';
    const last = lastName ? lastName[0].toUpperCase() : '';
    return first + last || '?';
  };

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Пользователь';

  return (
    <div style={{ 
      color: textColor, 
      backgroundColor: bgColor,
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '8px', color: linkColor }}>
            🔐 Профиль
          </h1>
          <p style={{ color: hintColor, fontSize: '14px' }}>
            Данные пользователя Telegram (валидированы на сервере)
          </p>
        </div>

        {/* Аватар */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          {user.photo_url ? (
            <img 
              src={user.photo_url} 
              alt="Avatar" 
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: `4px solid ${linkColor}`,
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${linkColor} 0%, #1a5f99 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              border: `4px solid ${linkColor}`
            }}>
              <span style={{ 
                fontSize: '48px', 
                fontWeight: 'bold', 
                color: '#ffffff' 
              }}>
                {getInitials(user.first_name, user.last_name)}
              </span>
            </div>
          )}
        </div>

        {/* Имя пользователя */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{fullName}</h2>
          {user.username && (
            <p style={{ color: linkColor, fontSize: '16px' }}>@{user.username}</p>
          )}
        </div>

        {/* Информация о пользователе */}
        <div style={{
          backgroundColor: secondaryBg,
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: bgColor,
            borderRadius: '8px',
            border: `1px solid ${hintColor}20`
          }}>
            <span style={{ color: hintColor, fontSize: '14px', fontWeight: '500' }}>
              ID пользователя:
            </span>
            <span style={{ fontWeight: '600' }}>{user.id}</span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: bgColor,
            borderRadius: '8px',
            border: `1px solid ${hintColor}20`
          }}>
            <span style={{ color: hintColor, fontSize: '14px', fontWeight: '500' }}>
              Telegram ID:
            </span>
            <span style={{ fontWeight: '600' }}>{user.tg_id}</span>
          </div>

          {user.username && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              backgroundColor: bgColor,
              borderRadius: '8px',
              border: `1px solid ${hintColor}20`
            }}>
              <span style={{ color: hintColor, fontSize: '14px', fontWeight: '500' }}>
                Username:
              </span>
              <span style={{ fontWeight: '600', color: linkColor }}>
                @{user.username}
              </span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: bgColor,
            borderRadius: '8px',
            border: `1px solid ${hintColor}20`
          }}>
            <span style={{ color: hintColor, fontSize: '14px', fontWeight: '500' }}>
              Имя:
            </span>
            <span style={{ fontWeight: '600' }}>{user.first_name}</span>
          </div>

          {user.last_name && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              backgroundColor: bgColor,
              borderRadius: '8px',
              border: `1px solid ${hintColor}20`
            }}>
              <span style={{ color: hintColor, fontSize: '14px', fontWeight: '500' }}>
                Фамилия:
              </span>
              <span style={{ fontWeight: '600' }}>{user.last_name}</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: bgColor,
            borderRadius: '8px',
            border: `1px solid ${hintColor}20`
          }}>
            <span style={{ color: hintColor, fontSize: '14px', fontWeight: '500' }}>
              Роли:
            </span>
            <span style={{ fontWeight: '600' }}>
              {user.roles.join(', ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}