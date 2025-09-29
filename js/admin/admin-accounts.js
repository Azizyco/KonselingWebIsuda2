import { adminGuard } from './guard.js';
import { supabase } from '../supa.js';
import { toast, showModal, hideModal, setupModal, confirmDialog } from '../ui.js';

const ACCOUNTS_PER_PAGE = 10;
let currentPage = 0;
let currentRoleFilter = 'all';
let currentSearchQuery = '';
let currentSort = 'created_at_desc'; // Default sort by latest

document.addEventListener('DOMContentLoaded', async () => {
    await adminGuard();
    loadKPIs();
    loadAccounts(true);

    // Setup modal
    setupModal('account-detail-modal', [], [document.querySelector('#account-detail-modal .modal-close')]);

    // Event Listeners for filters and search
    document.getElementById('search-btn').addEventListener('click', () => {
        currentSearchQuery = document.getElementById('search-input').value;
        loadAccounts(true);
    });
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            currentSearchQuery = document.getElementById('search-input').value;
            loadAccounts(true);
        }
    });
    document.getElementById('role-filter').addEventListener('change', (e) => {
        currentRoleFilter = e.target.value;
        loadAccounts(true);
    });
    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        loadAccounts(true);
    });

    // Event Listeners for modal actions
    document.getElementById('update-role-btn').addEventListener('click', handleUpdateRole);
    document.getElementById('delete-account-btn').addEventListener('click', handleDeleteAccount);
    
});

async function loadKPIs() {
    const kpiTotalAccounts = document.getElementById('kpi-total-accounts');
    const kpiStudentAccounts = document.getElementById('kpi-student-accounts');
    const kpiStaffAccounts = document.getElementById('kpi-staff-accounts');

    // Total Accounts
    const { count: totalCount, error: totalError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    if (!totalError) kpiTotalAccounts.textContent = totalCount;

    // Student Accounts
    const { count: studentCount, error: studentError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'siswa');
    if (!studentError) kpiStudentAccounts.textContent = studentCount;

    // Staff Accounts (Admin + Guru)
    const { count: staffCount, error: staffError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['admin', 'guru']);
    if (!staffError) kpiStaffAccounts.textContent = staffCount;
}

async function loadAccounts(isNewQuery = false) {
    if (isNewQuery) {
        currentPage = 0;
    }

    const tableBody = document.getElementById('accounts-table-body');
    tableBody.innerHTML = '<tr><td colspan="5" class="skeleton" style="height: 50px;"></td></tr>'.repeat(ACCOUNTS_PER_PAGE / 2); // Simple skeleton loader

    let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

    if (currentRoleFilter !== 'all') {
        query = query.eq('role', currentRoleFilter);
    }

    if (currentSearchQuery) {
        query = query.or(`name.ilike.%${currentSearchQuery}%,email.ilike.%${currentSearchQuery}%`);
    }

    // Apply sorting
    query = applySorting(query, currentSort);

    const { data, count, error } = await query.range(
        currentPage * ACCOUNTS_PER_PAGE,
        (currentPage + 1) * ACCOUNTS_PER_PAGE - 1
    );

    if (error) {
        toast('Gagal memuat akun.', 'error');
        console.error(error);
        tableBody.innerHTML = '<tr><td colspan="5">Gagal memuat data akun.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">Tidak ada akun ditemukan.</td></tr>';
    } else {
        data.forEach(profile => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${profile.name || 'N/A'}</td>
                <td>${profile.email}</td>
                <td><span class="badge">${profile.role}</span></td>
                <td>${new Date(profile.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn edit-account-btn" data-id="${profile.id}">Detail</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    document.querySelectorAll('.edit-account-btn').forEach(btn => btn.addEventListener('click', handleViewDetail));
    renderPagination(count);
}

function renderPagination(totalCount) {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = '';

    const totalPages = Math.ceil(totalCount / ACCOUNTS_PER_PAGE);

    if (totalPages <= 1) return;

    const createButton = (text, page, isActive = false, isDisabled = false) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.classList.add('btn');
        if (isActive) button.classList.add('active');
        if (isDisabled) button.disabled = true;
        button.addEventListener('click', () => {
            currentPage = page;
            loadAccounts(false);
        });
        return button;
    };

    paginationControls.appendChild(createButton('Sebelumnya', Math.max(0, currentPage - 1), false, currentPage === 0));

    let startPage = Math.max(0, currentPage - 2);
    let endPage = Math.min(totalPages - 1, currentPage + 2);

    if (currentPage < 2) endPage = Math.min(totalPages - 1, 4);
    if (currentPage > totalPages - 3) startPage = Math.max(0, totalPages - 5);

    for (let i = startPage; i <= endPage; i++) {
        paginationControls.appendChild(createButton(i + 1, i, i === currentPage));
    }

    paginationControls.appendChild(createButton('Berikutnya', Math.min(totalPages - 1, currentPage + 1), false, currentPage === totalPages - 1));
}

async function handleViewDetail(event) {
    const id = event.target.dataset.id;
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !profile) {
        toast('Gagal memuat detail akun.', 'error');
        console.error(error);
        return;
    }

    document.getElementById('detail-account-id').value = profile.id;
    document.getElementById('detail-name').value = profile.name || '';
    document.getElementById('detail-email').value = profile.email || '';
    document.getElementById('detail-phone').value = profile.phone || '';
    document.getElementById('detail-address').value = profile.address || '';
    document.getElementById('detail-role').value = profile.role;


    showModal('account-detail-modal');
}

async function handleUpdateRole() {
    const accountId = document.getElementById('detail-account-id').value;
    const newRole = document.getElementById('detail-role').value;

    const confirmed = await confirmDialog(`Apakah Anda yakin ingin mengubah peran akun ini menjadi "${newRole}"?`);
    if (!confirmed) return;

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', accountId);

    if (error) {
        toast(`Gagal memperbarui peran: ${error.message}`, 'error');
    } else {
        toast('Peran akun berhasil diperbarui.', 'success');
        hideModal('account-detail-modal');
        loadAccounts(false); // Reload current page
        loadKPIs(); // Update KPIs
    }
}

async function handleDeleteAccount() {
  const accountId = document.getElementById('detail-account-id').value;
  const accountEmail = document.getElementById('detail-email').value;

  const ok = await confirmDialog(`Hapus akun "${accountEmail}"? Tindakan ini tidak dapat dibatalkan.`);
  if (!ok) return;

  // Panggil Edge Function yang baru kamu deploy
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId: accountId }
  });

  if (error || !data?.ok) {
    toast(`Gagal menghapus: ${data?.error || error?.message}`, 'error');
    return;
  }

  toast('Akun berhasil dihapus.', 'success');
  hideModal('account-detail-modal');
  loadAccounts(true);
  loadKPIs();
}



function applySorting(query, sortValue) {
  // dukung: created_at_asc|created_at_desc|name_asc|name_desc
  const parts = (sortValue || 'created_at_desc').split('_');
  const dir = parts.pop(); // 'asc'|'desc'
  const col = parts.join('_'); // gabung sisanya ('created_at' / 'name')
  const ascending = (dir === 'asc');
  return query.order(col, { ascending, nullsFirst: true });
}

