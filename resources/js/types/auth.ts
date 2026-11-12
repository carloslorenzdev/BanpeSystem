export type Role = {
    id: number;
    slug: string;
    name: string;
    description?: string | null;
};

export type User = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    position?: string | null;
    is_active?: boolean;
    role_id?: number | null;
    role?: Role | null;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
