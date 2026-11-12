import { Head, useForm } from '@inertiajs/react';
import {
    Briefcase,
    Building2,
    HardHat,
    Lock,
    LogIn,
    Mail,
    Package,
    Shield,
    Sparkles,
} from 'lucide-react';
import type { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import PasskeyVerify from '@/components/passkey-verify';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword?: boolean;
};

export default function Login({ status, canResetPassword = true }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    // Helper para autocompletar credenciales de demostración
    const fillDemo = (email: string) => {
        setData({
            ...data,
            email,
            password: 'password',
        });
    };

    return (
        <div className="space-y-6">
            <Head title="Iniciar Sesión" />

            {/* Verificación opcional por Passkey */}
            <PasskeyVerify
                label="Iniciar con llave de seguridad / Passkey"
                loadingLabel="Autenticando..."
                separator="O ingresa con tus credenciales"
            />

            {status && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                {/* Campo Email */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground" />
                        Correo Electrónico
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        required
                        autoFocus
                        tabIndex={1}
                        autoComplete="email"
                        placeholder="usuario@banpe.com.ve"
                        className="h-10 bg-background"
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} />
                </div>

                {/* Campo Contraseña */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Lock className="size-3.5 text-muted-foreground" />
                            Contraseña
                        </Label>
                        {canResetPassword && (
                            <TextLink
                                href={request()}
                                className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                tabIndex={5}
                            >
                                ¿Olvidaste tu contraseña?
                            </TextLink>
                        )}
                    </div>
                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        required
                        tabIndex={2}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-10 bg-background"
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} />
                </div>

                {/* Recordar Sesión */}
                <div className="flex items-center space-x-2.5">
                    <Checkbox
                        id="remember"
                        checked={data.remember}
                        onCheckedChange={(checked) => setData('remember', checked === true)}
                        tabIndex={3}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer select-none">
                        Mantener mi sesión activa en este equipo
                    </Label>
                </div>

                {/* Botón de Enviar */}
                <Button
                    type="submit"
                    className="w-full h-11 text-sm font-semibold tracking-wide shadow-sm"
                    tabIndex={4}
                    disabled={processing}
                >
                    {processing ? (
                        <>
                            <Spinner className="mr-2" />
                            Accediendo al sistema...
                        </>
                    ) : (
                        <>
                            <LogIn className="mr-2 size-4" />
                            Ingresar a la Plataforma
                        </>
                    )}
                </Button>
            </form>

            {/* Caja de Roles para Demostración Rápida (Ideal para reuniones y testing) */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-amber-500" />
                        Acceso Rápido de Prueba (Demo)
                    </span>
                    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground py-0 h-5">
                        Clave: password
                    </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                    Haz clic en cualquier rol para autocompletar credenciales de prueba:
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => fillDemo('residente@banpe.com.ve')}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-left hover:border-amber-500/50 hover:bg-accent transition-colors"
                    >
                        <HardHat className="size-4 text-amber-600 shrink-0" />
                        <div className="truncate">
                            <div className="font-semibold text-foreground truncate">Ing. Residente</div>
                            <div className="text-[10px] text-muted-foreground truncate">residente@banpe.com.ve</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => fillDemo('almacen@banpe.com.ve')}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-left hover:border-amber-500/50 hover:bg-accent transition-colors"
                    >
                        <Package className="size-4 text-blue-600 shrink-0" />
                        <div className="truncate">
                            <div className="font-semibold text-foreground truncate">Jefe Almacén</div>
                            <div className="text-[10px] text-muted-foreground truncate">almacen@banpe.com.ve</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => fillDemo('compras@banpe.com.ve')}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-left hover:border-amber-500/50 hover:bg-accent transition-colors"
                    >
                        <Briefcase className="size-4 text-emerald-600 shrink-0" />
                        <div className="truncate">
                            <div className="font-semibold text-foreground truncate">Procura/Compras</div>
                            <div className="text-[10px] text-muted-foreground truncate">compras@banpe.com.ve</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => fillDemo('gerente@banpe.com.ve')}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-left hover:border-amber-500/50 hover:bg-accent transition-colors"
                    >
                        <Building2 className="size-4 text-purple-600 shrink-0" />
                        <div className="truncate">
                            <div className="font-semibold text-foreground truncate">Gerente Proyecto</div>
                            <div className="text-[10px] text-muted-foreground truncate">gerente@banpe.com.ve</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => fillDemo('admin@banpe.com.ve')}
                        className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-1.5 px-3 hover:border-amber-500/50 hover:bg-accent transition-colors text-center"
                    >
                        <Shield className="size-3.5 text-red-500 shrink-0" />
                        <span className="font-semibold text-foreground">Administrador del Sistema</span>
                        <span className="text-[10px] text-muted-foreground">(admin@banpe.com.ve)</span>
                    </button>
                </div>
            </div>

            {/* Aviso de soporte corporativo */}
            <p className="text-center text-xs text-muted-foreground pt-2">
                ¿Problemas para acceder? Contacta a la coordinación de sistemas en{' '}
                <span className="font-medium text-foreground">soporte@banpe.com.ve</span>
            </p>
        </div>
    );
}

Login.layout = {
    title: 'Iniciar Sesión',
    description: 'Ingresa tu correo institucional y contraseña para continuar',
};
