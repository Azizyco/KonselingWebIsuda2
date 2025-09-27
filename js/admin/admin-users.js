import { adminGuard } from './guard.js';
import { supabase } from '../supa.js';
import { toast, showModal, hideModal, setupModal } from '../ui.js';

const PAGE_SIZE = 10;
let state = {
    currentPage: 1,
    totalCount: 0,
    roleFilter: 'all',
    searchTerm: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    cachedUsers: new Map(),
};

document.addEventListener('DOMContentLoaded', async () => {
    await adminGuard();
    
    setupEventListeners();
    setupModal('detail-modal', [], [document.querySelector('#detail-modal .modal-close')]);

    fetchKPIs();
    fetchUsers();
});

function setupEventListeners() {
    document.getElementById('role-filter-tabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('#role-filter-tabs .tab-link').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.roleFilter = e.target.dataset.role;
            state.currentPage = 1;
            fetchUsers();
        }
    });

    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchTerm = e.target.value;
            state.currentPage = 1;
            fetchUsers();
        }, 300);
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
        const [sortBy, sortOrder] = e.target.value.split('-');
        state.sortBy = sortBy;
        state.sortOrder = sortOrder;
        state.currentPage = 1;
        fetchUsers();
    });

    document.getElementById('prev-page-btn').addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            fetchUsers();
        }
    });

    document.getElementById('next-page-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(state.totalCount / PAGE_SIZE);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            fetchUsers();
        }
    });
}

async function fetchKPIs() {
    const kpiFields = {
        'kpi-total': null,
        'kpi-siswa': 'siswa',
        'kpi-guru': 'guru',
        'kpi-admin': 'admin'
    };

    for (const [id, role] of Object.entries(kpiFields)) {
        let query = supabase.from('profiles').select('*', { count: 'exact', head: true });
        if (role) {
            query = query.eq('role', role);
        }
        const { count, error } = await query;
        if (!error) {
            document.getElementById(id).textContent = count;
        }
    }
}

async function fetchUsers() {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = renderSkeletons();
    
    const offset = (state.currentPage - 1) * PAGE_SIZE;
    
    let query = supabase
        .from('profiles')
        .select('id, name, role, address, phone, created_at', { count: 'exact' });

    if (state.roleFilter !== 'all') {
        query = query.eq('role', state.roleFilter);
    }

    if (state.searchTerm) {
        query = query.ilike('name', `%${state.searchTerm}%`);
    }

    query = query.order(state.sortBy, { ascending: state.sortOrder === 'asc', nullsFirst: true });
    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data: users, error, count } = await query;

    if (error) {
        toast('Gagal memuat data akun.', 'error');
        tableBody.innerHTML = `<tr><td colspan="4">Terjadi kesalahan.</td></tr>`;
        return;
    }

    state.totalCount = count;
    state.cachedUsers.clear();
    users.forEach(user => state.cachedUsers.set(user.id, user));

    renderTable(users);
    updatePagination();
}

function renderTable(users) {
    const tableBody = document.getElementById('users-table-body');
    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Tidak ada akun ditemukan.</td></tr>`;
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td data-label="Nama">${user.name || 'N/A'}</td>
            <td data-label="Peran"><span class="badge" data-role="${user.role}">${user.role}</span></td>
            <td data-label="Dibuat">${new Date(user.created_at).toLocaleDateString('id-ID')}</td>
            <td data-label="Aksi"><button class="btn view-btn" data-id="${user.id}">Lihat</button></td>
        </tr>
    `).join('');

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => showDetailModal(e.target.dataset.id));
    });
}

function showDetailModal(userId) {
    const user = state.cachedUsers.get(userId);
    if (!user) return;

    document.getElementById('detail-name').value = user.name || '';
    document.getElementById('detail-role').value = user.role || '';
    document.getElementById('detail-address').value = user.address || '';
    document.getElementById('detail-phone').value = user.phone || '';
    document.getElementById('detail-created').value = new Date(user.created_at).toLocaleString('id-ID');
    document.getElementById('detail-id').value = user.id;

    showModal('detail-modal');
}

function updatePagination() {
    const totalPages = Math.ceil(state.totalCount / PAGE_SIZE) || 1;
    document.getElementById('page-indicator').textContent = `Halaman ${state.currentPage} dari ${totalPages}`;
    document.getElementById('prev-page-btn').disabled = state.currentPage === 1;
    document.getElementById('next-page-btn').disabled = state.currentPage === totalPages;
}

function renderSkeletons() {
    return Array(PAGE_SIZE).fill('').map(() => `
        <tr>
            <td><div class="skeleton" style="height: 20px; width: 120px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 60px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
            <td><div class="skeleton" style="height: 38px; width: 60px;"></div></td>
        </tr>
    `).join('');
}
