declare global {
    interface Window {
        Telegram?: {
            WebApp?: {
                ready: () => void;
                expand?: () => void;
                colorScheme?: 'light' | 'dark';
                initData?: string;  // ← Добавить это поле
                themeParams?: {
                    bg_color?: string;
                    button_color?: string;
                    text_color?: string;
                    hint_color?: string;
                    link_color?: string;
                    button_text_color?: string;
                    secondary_bg_color?: string;
                };
                initDataUnsafe?: {
                    user?: {
                        id: number;
                        first_name: string;
                        last_name?: string;
                        username?: string;
                        language_code?: string;
                        is_premium?: boolean;
                        added_to_attachment_menu?: boolean;
                        allows_write_to_pm?: boolean;
                        photo_url?: string;
                    };
                };
            }
        };
    }
}
export {};