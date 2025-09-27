import { supabase } from './supa.js';
import { signIn, signUp, resetPassword, getUserProfile } from './auth.js';
import { toast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const adminLoginForm = document.getElementById('admin-login-form');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const email = formData.get('email');
            const password = formData.get('password');
            const user = await signIn(email, password);
            if (user) {
                window.location.href = '/';
            }
        });
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(adminLoginForm);
            const email = formData.get('email');
            const password = formData.get('password');
            const user = await signIn(email, password);
            if (user) {
                const profile = await getUserProfile(user.id);
                if (profile && ['admin', 'guru'].includes(profile.role)) {
                    window.location.href = '/admin/';
                } else {
                    toast('Bukan akun staf. Akses ditolak.', 'error');
                    await supabase.auth.signOut();
                }
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const password = formData.get('password');
            const phone = formData.get('phone');
            const address = formData.get('address');
            
            await signUp(name, email, password, phone, address);
            registerForm.reset();
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt('Masukkan alamat email Anda untuk reset kata sandi:');
            if (email) {
                await resetPassword(email);
            }
        });
    }
});
