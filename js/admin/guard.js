import { requireAdmin } from '../auth.js';
import { signOut } from '../auth.js';

export async function adminGuard() {
    const adminData = await requireAdmin();
    if (!adminData) return null;

    const adminUserContainer = document.getElementById('admin-user');
    if (adminUserContainer) {
        adminUserContainer.textContent = ` ${adminData.user.email}`;
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }
    
    return adminData;
}
