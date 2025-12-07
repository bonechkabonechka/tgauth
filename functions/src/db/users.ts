import * as admin from 'firebase-admin';

// Инициализируем Firestore (будет инициализирован в index.ts)
let db: admin.firestore.Firestore;

export function initDatabase(firestore: admin.firestore.Firestore) {
  db = firestore;
}

export interface User {
  id: string;
  tg_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  roles: string[];
  created_at: admin.firestore.Timestamp;
  updated_at: admin.firestore.Timestamp;
}

/**
 * Находит пользователя по Telegram ID
 */
export async function getUserByTgId(tgId: number): Promise<User | null> {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('tg_id', '==', tgId).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as User;
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
}

/**
 * Создает нового пользователя
 */
export async function createUser(userData: {
  tg_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  roles?: string[];
}): Promise<User | null> {
  try {
    const now = admin.firestore.Timestamp.now();
    
    const newUser = {
      tg_id: userData.tg_id,
      first_name: userData.first_name,
      last_name: userData.last_name || '',
      username: userData.username || '',
      photo_url: userData.photo_url || '',
      roles: userData.roles || ['user'],
      created_at: now,
      updated_at: now,
    };

    const docRef = await db.collection('users').add(newUser);
    
    return {
      id: docRef.id,
      ...newUser,
    } as User;
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    return null;
  }
}

/**
 * Находит или создает пользователя (upsert)
 */
export async function findOrCreateUser(userData: {
  tg_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}): Promise<User | null> {
  // Пытаемся найти существующего пользователя
  let user = await getUserByTgId(userData.tg_id);

  if (user) {
    // Обновляем данные если нужно
    const updates: any = {
      updated_at: admin.firestore.Timestamp.now(),
    };

    if (userData.first_name !== user.first_name) updates.first_name = userData.first_name;
    if (userData.last_name !== user.last_name) updates.last_name = userData.last_name;
    if (userData.username !== user.username) updates.username = userData.username;
    if (userData.photo_url !== user.photo_url) updates.photo_url = userData.photo_url;

    if (Object.keys(updates).length > 1) {
      // Есть изменения, обновляем
      await db.collection('users').doc(user.id).update(updates);
      user = { ...user, ...updates } as User;
    }

    return user;
  }

  // Создаем нового пользователя
  return await createUser(userData);
}