import { adminGuard } from './guard.js';
import { supabase } from '../supa.js';

document.addEventListener('DOMContentLoaded', async () => {
    await adminGuard();
    loadKPIs();
});

async function loadKPIs() {
    const kpiStudents = document.getElementById('kpi-students');
    const kpiMaterials = document.getElementById('kpi-materials');
    const kpiNotifications = document.getElementById('kpi-notifications');
    const kpiTotalAccounts = document.getElementById('kpi-total-accounts'); // New KPI

    // Count students
    const { count: studentCount, error: studentError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'siswa');
    if (!studentError) kpiStudents.textContent = studentCount;

    // Count materials
    const { count: materialCount, error: materialError } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true });
    if (!materialError) kpiMaterials.textContent = materialCount;

    // Count active notifications
    const { count: notificationCount, error: notificationError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('notify_email', true);
    if (!notificationError) kpiNotifications.textContent = notificationCount;

    // Count total accounts (new KPI)
    const { count: totalAccountsCount, error: totalAccountsError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    if (!totalAccountsError) kpiTotalAccounts.textContent = totalAccountsCount;
}
