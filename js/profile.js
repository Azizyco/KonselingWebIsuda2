import { supabase } from './supa.js';
import { requireAuth, signOut, getUserProfile } from './auth.js';
import { renderAuthButtons, toast, initMobileNav } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user) return;

    renderAuthButtons(user);
    loadProfile(user);
    
    // Initialize mobile navigation
    initMobileNav();

    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        const updates = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            notify_email: formData.get('notify_email') === 'on',
        };
        
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            toast('Gagal memperbarui profil.', 'error');
        } else {
            toast('Profil berhasil diperbarui.', 'success');
        }
    });

    document.getElementById('logout-btn').addEventListener('click', signOut);
});

async function loadProfile(user) {
    document.getElementById('email').value = user.email;
    const profile = await getUserProfile(user.id);
    if (profile) {
        document.getElementById('name').value = profile.name || '';
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('address').value = profile.address || '';
        document.getElementById('notify_email').checked = profile.notify_email;
    }
}
