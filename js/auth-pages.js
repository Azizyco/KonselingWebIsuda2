import { supabase } from './supa.js';
import { signIn, signUp, resetPassword, getUserProfile, updateUserProfile } from './auth.js';
import { toast } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginAfterRegisForm = document.getElementById('login-afterregis-form');
    const dataPribadiForm = document.getElementById('datapribadi-form');
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

    if (loginAfterRegisForm) {
        loginAfterRegisForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginAfterRegisForm);
            const email = formData.get('email');
            const password = formData.get('password');
            const user = await signIn(email, password);
            if (user) {
                window.location.href = '/datapribadi.html';
            }
        });
    }

    if (dataPribadiForm) {
        dataPribadiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(dataPribadiForm);
            const name = formData.get('name');
            const phone = formData.get('phone');
            const address = formData.get('address');
            
            const user = await supabase.auth.getUser();
            if (user.data.user) {
                const { error } = await updateUserProfile(user.data.user.id, {
                    name,
                    phone,
                    address
                });
                
                if (!error) {
                    toast('Data diri berhasil disimpan!', 'success');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 1500);
                }
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
            const email = formData.get('email');
            const password = formData.get('password');
            
            // Hanya kirim email dan password untuk registrasi awal
            const user = await signUp(email, password);
            registerForm.reset();
            
            // Redirect ke halaman verifikasi setelah register berhasil
            if (user) {
                setTimeout(() => {
                    window.location.href = '/verif.html';
                }, 1500); // Delay 1.5 detik agar user bisa membaca pesan sukses
            }
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
