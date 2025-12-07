import type { User } from '../types/auth';

interface UserProfileProps {
  user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Пользователь';

  return (
    <div>
      <h1>Профиль</h1>
      
      {user.photo_url && (
        <img src={user.photo_url} alt="Avatar" />
      )}

      <h2>{fullName}</h2>
      
      {user.username && (
        <p>@{user.username}</p>
      )}

      <div>
        <p>ID: {user.id}</p>
        <p>Telegram ID: {user.tg_id}</p>
        <p>Имя: {user.first_name}</p>
        {user.last_name && <p>Фамилия: {user.last_name}</p>}
        <p>Роли: {user.roles.join(', ')}</p>
      </div>
    </div>
  );
}