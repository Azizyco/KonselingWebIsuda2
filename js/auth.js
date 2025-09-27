import { supabase } from './supa.js';
import { toast } from './ui.js';

export async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getUserProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
}

export async function signUp(name, email, password, phone, address) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
                phone,
                address,
                role: 'siswa',
                notify_email: false
            }
        }
    });
    if (error) {
        toast(error.message, 'error');
        return null;
    }
    toast('Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.', 'success');
    return data.user;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        toast(error.message, 'error');
        return null;
    }
    return data.user;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        toast(error.message, 'error');
    } else {
        window.location.href = '/';
    }
}

export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/password-reset.html`,
    });
    if (error) {
        toast(error.message, 'error');
    } else {
        toast('Email pemulihan kata sandi telah dikirim.', 'success');
    }
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = `/login.html?redirect=${window.location.pathname}`;
        return null;
    }
    return user;
}

export async function requireAdmin() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = `/admin/admin-login.html?redirect=${window.location.pathname}`;
        return null;
    }

    const profile = await getUserProfile(user.id);
    if (!profile || !['admin', 'guru'].includes(profile.role)) {
        toast('Akses ditolak. Bukan akun staf.', 'error');
        await signOut();
        window.location.href = '/admin/admin-login.html';
        return null;
    }
    return { user, profile };
}
