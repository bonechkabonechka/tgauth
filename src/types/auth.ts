export interface User {
    id: string;
    tg_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    roles: string[];
  }
  
  export interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
  }
  
  export interface AuthContextType extends AuthState {
    signIn: (initData: string) => Promise<void>;
    signOut: () => Promise<void>;
    checkAuth: () => Promise<void>;
  }