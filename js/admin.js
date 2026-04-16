// ===============================================
// Marine Admin Dashboard - admin.js V4
// WITH EMAIL/PASSWORD VERIFICATION & ACTIVITY TRACKING
// ===============================================

const API_URL = "https://script.google.com/macros/s/AKfycbxDmXNNGxCUP3dAvzO2yc5Byx4n71SeieXDeA3Gs3v1tbVo4pscsFgtcibTxDAuZc4/exec";

let ADMIN_EMAIL = "";
let ADMIN_ROLE  = "";
let ADMIN_NAME  = "";

// ===== LOADING OVERLAY =====
function showLoadingOverlay(msg = 'กำลังโหลด...') {
  let overlay = document.getElementById('globalLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalLoadingOverlay';
    overlay.style = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `<div style="background:#fff;padding:32px 40px;border-radius:16px;box-shadow:0 8px 32px #0002;text-align:center;font-size:1.3rem;display:flex;flex-direction:column;align-items:center;gap:16px;">
      <div class='loader' style='border:6px solid #eee;border-top:6px solid #2563eb;border-radius:50%;width:48px;height:48px;animation:spin 1s linear infinite;'></div>
      <span id='globalLoadingMsg'>${msg}</span>
    </div>`;
    document.body.appendChild(overlay);
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`;
    document.head.appendChild(style);
  } else {
    overlay.style.display = 'flex';
    document.getElementById('globalLoadingMsg').textContent = msg;
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('globalLoadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ===== FETCH WITH TIMEOUT =====
async function apiFetch(url, options = {}, timeout = 7000, loadingMsg = 'กำลังโหลด...') {
  showLoadingOverlay(loadingMsg);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    hideLoadingOverlay();
    return response;
  } catch (e) {
    clearTimeout(id);
    hideLoadingOverlay();
    if (e.name !== 'AbortError') {
      Swal.fire('ผิดพลาด', e.message || 'เกิดข้อผิดพลาด', 'error');
    }
    throw e;
  }
}

// ===== GLOBAL ERROR HANDLERS =====
window.addEventListener('error', function(e) {
  hideLoadingOverlay();
  console.error('Global Error:', e);
});

window.addEventListener('unhandledrejection', function(e) {
  hideLoadingOverlay();
  console.error('Unhandled Rejection:', e.reason);
});

// ===============================================
// LOGIN/LOGOUT
// ===============================================
async function handleAdminLogin() {
  const emailInput = document.getElementById('loginEmailInput');
  const passwordInput = document.getElementById('loginPasswordInput');
  const loginError = document.getElementById('loginError');
  const emailText = emailInput.value.trim();
  const passwordText = passwordInput.value.trim();
  
  // Validation
  if (!emailText) {
    loginError.textContent = '⚠️ กรุณากรอก Email';
    loginError.style.display = 'block';
    emailInput.focus();
    return;
  }
  
  if (!passwordText) {
    loginError.textContent = '⚠️ กรุณากรอกรหัสผ่าน';
    loginError.style.display = 'block';
    passwordInput.focus();
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailText)) {
    loginError.textContent = '⚠️ รูปแบบ email ไม่ถูกต้อง';
    loginError.style.display = 'block';
    emailInput.focus();
    return;
  }
  
  loginError.textContent = '⏳ กำลังตรวจสอบ...';
  loginError.style.display = 'block';
  loginError.style.color = '#1976d2';
  
  try {
    const res = await apiFetch(
      `${API_URL}?action=verifyAdmin&email=${encodeURIComponent(emailText)}&password=${encodeURIComponent(passwordText)}`,
      {},
      7000,
      'กำลังตรวจสอบข้อมูล...'
    );
    const data = await res.json();
    
    if (data.status === 'success') {
      // Login สำเร็จ
      localStorage.setItem('adminEmail', data.email);
      localStorage.setItem('adminRole', data.role);
      localStorage.setItem('adminName', data.name);
      
      ADMIN_EMAIL = data.email;
      ADMIN_ROLE = data.role;
      ADMIN_NAME = data.name;
      
      const form = document.getElementById('loginForm');
      const content = document.getElementById('adminContent');
      
      if (form) form.style.display = 'none';
      if (content) content.style.display = 'block';
      
      document.getElementById('adminEmailDisplay').textContent = data.email;
      document.getElementById('adminRoleDisplay').textContent = `ยศ: ${roleLabel(data.role)}`;
      
      emailInput.value = '';
      passwordInput.value = '';
      loginError.style.display = 'none';
      
      applyRoleUI();
      
      // บันทึกการเข้าสู่ระบบ
      trackAdminLogin(ADMIN_EMAIL, ADMIN_ROLE, 'login');
      
      loadDashboard();
      show('dashboard');
      
    } else {
      loginError.textContent = '⚠️ ' + (data.message || 'Email หรือรหัสผ่านไม่ถูกต้อง');
      loginError.style.color = '#d32f2f';
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (err) {
    loginError.textContent = '⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ';
    loginError.style.color = '#d32f2f';
    console.error(err);
  }
}

function handleAdminLogout() {
  if (confirm('คุณแน่ใจที่จะออกจากระบบ?')) {
    // บันทึกการออกจากระบบ
    trackAdminLogin(ADMIN_EMAIL, ADMIN_ROLE, 'logout');
    
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminName');
    ADMIN_EMAIL = '';
    ADMIN_ROLE = '';
    ADMIN_NAME = '';
    
    const form = document.getElementById('loginForm');
    const content = document.getElementById('adminContent');
    
    if (form) form.style.display = 'flex';
    if (content) content.style.display = 'none';
    
    document.getElementById('loginEmailInput').value = '';
    document.getElementById('loginPasswordInput').value = '';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('loginEmailInput').focus();
  }
}

function roleLabel(role) {
  return { superadmin: 'Super Admin', admin: 'Admin', viewer: 'Viewer' }[role] || role;
}

function applyRoleUI() {
  // Superadmin เห็นทั้งหมด
  const settingsBtn = document.getElementById('nav-settings');
  const adminBtn = document.getElementById('nav-adminManage');
  const activityBtn = document.getElementById('nav-adminActivity');
  
  const m_settingsBtn = document.getElementById('m-nav-settings');
  
  if (ADMIN_ROLE === 'superadmin') {
    if (settingsBtn) settingsBtn.style.display = '';
    if (adminBtn) adminBtn.style.display = '';
    if (activityBtn) activityBtn.style.display = '';
    if (m_settingsBtn) m_settingsBtn.style.display = '';
  } else {
    if (settingsBtn) settingsBtn.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none';
    if (activityBtn) activityBtn.style.display = 'none';
    if (m_settingsBtn) m_settingsBtn.style.display = 'none';
  }
}

// ===============================================
// ACTIVITY TRACKING
// ===============================================
async function trackAdminLogin(email, role, action) {
  try {
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const params = new URLSearchParams({ 
      action: 'trackAdminActivity',
      email: email,
      role: role,
      actType: action,
      timestamp: timestamp
    });
    await fetch(API_URL, { 
      method: 'POST', 
      body: params, 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
    });
  } catch (e) { console.error('Activity tracking error:', e); }
}

async function loadAdminActivity() {
  if (ADMIN_ROLE !== 'superadmin') {
    Swal.fire('ไม่มีสิทธิ์', 'เฉพาะ Super Admin เท่านั้น', 'warning');
    return;
  }
  
  const tbody = document.getElementById('activityBody');
  tbody.innerHTML = '<tr><td colspan="6">⏳ กำลังโหลด...</td></tr>';
  
  try {
    const res = await apiFetch(`${API_URL}?action=getAdminActivity`, {}, 7000, 'กำลังดึงข้อมูลกิจกรรม...');
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">ไม่มีข้อมูล</td></tr>';
      document.getElementById('onlineAdmins').textContent = 'ไม่มี';
      document.getElementById('adminStats').textContent = 'ไม่มีข้อมูล';
      return;
    }
    
    tbody.innerHTML = '';
    let onlineCount = 0;
    const adminMap = {};
    
    // สรุปสถิติ
    data.forEach(d => {
      if (!adminMap[d.role]) adminMap[d.role] = 0;
      adminMap[d.role]++;
      if (d.action === 'login') onlineCount++;
    });
    
    // แสดงข้อมูล
    data.forEach((d, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.timestamp}</td>
        <td>${d.email}</td>
        <td>${d.name || '-'}</td>
        <td><span class="role-badge role-${d.role}">${roleLabel(d.role)}</span></td>
        <td>${d.action === 'login' ? '🟢 เข้าสู่ระบบ' : '🔴 ออกจากระบบ'}</td>
        <td>${d.status || 'success'}</td>
      `;
      tbody.appendChild(tr);
    });
    
    // Online admins
    document.getElementById('onlineAdmins').innerHTML = `
      <div>🟢 ออนไลน์: <strong>${onlineCount}</strong> คน</div>
    `;
    
    // Stats
    let statsHtml = '';
    for (const role in adminMap) {
      statsHtml += `<div>ยศ ${roleLabel(role)}: ${adminMap[role]} คน</div>`;
    }
    document.getElementById('adminStats').innerHTML = statsHtml;
    
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6">เกิดข้อผิดพลาด</td></tr>';
  }
}

function downloadActivityLog() {
  const table = document.querySelector('#adminActivity table');
  if (!table) return;
  
  let csv = 'Timestamp,Email,Name,Role,Action,Status\n';
  table.querySelectorAll('tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    csv += Array.from(cells).map(c => `"${c.textContent.replace(/"/g, '""')}"`).join(',') + '\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `admin_activity_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// ===============================================
// NAVIGATION
// ===============================================
function show(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .m-nav-btn').forEach(b => b.classList.remove('active'));
  
  const pageEl = document.getElementById(page);
  const navEl = document.getElementById('nav-' + page);
  const mNavEl = document.getElementById('m-nav-' + page);
  
  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');
  if (mNavEl) mNavEl.classList.add('active');

  if (page === 'dashboard')     loadDashboard();
  if (page === 'leaveRequests') loadLeaveRequests();
  if (page === 'logs')          { const d = document.getElementById('logDate'); if (d) d.value = todayStr(); loadLogs(); }
  if (page === 'studentManage') loadStudents();
  if (page === 'settings')      loadSettings();
  if (page === 'adminManage')   loadAdmins();
  if (page === 'adminActivity') loadAdminActivity();
}

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

// ===============================================
// DASHBOARD
// ===============================================
async function loadDashboard() {
  try {
    const res = await apiFetch(`${API_URL}?action=getDashboard&email=${encodeURIComponent(ADMIN_EMAIL)}`, {}, 7000, 'กำลังโหลดสถิติ...');
    const data = await res.json();
    for (let i = 1; i <= 4; i++) {
      const d = data[`ปี ${i}`] || { present: 0, late: 0, leave: 0, absent: 0 };
      setText(`y${i}-present`, d.present);
      setText(`y${i}-late`, d.late);
      setText(`y${i}-leave`, d.leave);
      setText(`y${i}-absent`, d.absent);
    }
  } catch (e) {
    for (let i = 1; i <= 4; i++) {
      setText(`y${i}-present`, 0);
      setText(`y${i}-late`, 0);
      setText(`y${i}-leave`, 0);
      setText(`y${i}-absent`, 0);
    }
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ===============================================
// LEAVE REQUESTS
// ===============================================
async function loadLeaveRequests() {
  const tbody = document.getElementById('leaveBody');
  tbody.innerHTML = '<tr><td colspan="4">⏳ กำลังโหลด...</td></tr>';
  
  try {
    const res = await apiFetch(`${API_URL}?action=getLeaveRequests&email=${encodeURIComponent(ADMIN_EMAIL)}`, {}, 7000, 'กำลังดึงคำขอลา...');
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">ไม่มีคำขอลาค้างอนุมัติ</td></tr>';
      document.getElementById('leaveBadge').textContent = '0';
      return;
    }
    
    document.getElementById('leaveBadge').textContent = data.length;
    tbody.innerHTML = '';
    
    data.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.name}<br><small>${r.year} • ${r.date}</small></td>
        <td>${r.reason}</td>
        <td>${r.evidence ? `<a href="${r.evidence}" target="_blank">ดูหลักฐาน</a>` : '-'}</td>
        <td>
          ${ADMIN_ROLE !== 'viewer' ? `
            <button class="btn-approve" data-rowindex="${r.rowIndex}">✅ อนุมัติ</button>
            <button class="btn-reject"  data-rowindex="${r.rowIndex}">❌ ปฏิเสธ</button>
          ` : '<span>ไม่มีสิทธิ์อนุมัติ</span>'}
        </td>`;
      tbody.appendChild(tr);
    });
    
    tbody.querySelectorAll('.btn-approve').forEach(btn => btn.onclick = function(){ approveLeave(this.dataset.rowindex, 'อนุมัติ'); });
    tbody.querySelectorAll('.btn-reject').forEach(btn => btn.onclick = function(){ approveLeave(this.dataset.rowindex, 'ปฏิเสธ'); });
    
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4">เกิดข้อผิดพลาด</td></tr>';
  }
}

async function approveLeave(rowIndex, result) {
  if (ADMIN_ROLE === 'viewer') return Swal.fire('ไม่มีสิทธิ์', '', 'warning');
  
  const params = new URLSearchParams({ action: 'approveLeave', email: ADMIN_EMAIL, rowIndex, result });
  await apiFetch(API_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  loadLeaveRequests();
}

// ===============================================
// LOGS
// ===============================================
async function loadLogs() {
  const date = document.getElementById('logDate').value;
  const year = document.getElementById('logYear').value;
  const tbody = document.getElementById('logBody');
  tbody.innerHTML = '<tr><td colspan="4">⏳ กำลังโหลด...</td></tr>';
  
  try {
    const res = await apiFetch(
      `${API_URL}?action=getLogs&email=${encodeURIComponent(ADMIN_EMAIL)}&date=${date}&year=${encodeURIComponent(year)}`,
      {},
      7000,
      'กำลังดึงบันทึก...'
    );
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">ไม่มีข้อมูล</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    data.forEach(r => {
      const tr = document.createElement('tr');
      const statusClass = r.status === 'ปกติ' ? 'present' : r.status === 'สาย' ? 'late' : 'absent';
      tr.innerHTML = `
        <td>${r.name}</td>
        <td>${r.time}</td>
        <td><span class="badge-${statusClass}">${r.status}</span></td>
        <td>${ADMIN_ROLE === 'superadmin' ? `<button class="edit-log-btn" data-rowindex="${r.rowIndex}" data-status="${r.status}" style="font-size:12px;padding:4px 8px;">✏️ แก้ไข</button>` : '-'}</td>`;
      tbody.appendChild(tr);
    });
    
    tbody.querySelectorAll('.edit-log-btn').forEach(btn => btn.onclick = function(){ editLogRow(this.dataset.rowindex, this.dataset.status); });
    
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4">เกิดข้อผิดพลาด</td></tr>';
  }
}

async function editLogRow(rowIndex, currentStatus) {
  const { value: newStatus } = await Swal.fire({
    title: 'แก้ไขสถานะ',
    input: 'select',
    inputOptions: { ปกติ: 'ปกติ', สาย: 'สาย', ขาด: 'ขาด', ลา: 'ลา' },
    inputValue: currentStatus,
    showCancelButton: true
  });
  
  if (!newStatus) return;
  
  const params = new URLSearchParams({ action: 'editLog', email: ADMIN_EMAIL, rowIndex, field: 9, value: newStatus });
  const res = await apiFetch(API_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const result = await res.json();
  
  Swal.fire(result.status === 'success' ? 'สำเร็จ' : 'ผิดพลาด', result.message, result.status === 'success' ? 'success' : 'error');
  loadLogs();
}

// ===============================================
// STUDENT MANAGEMENT
// ===============================================
async function loadStudents() {
  const container = document.getElementById('studentAccordionContainer');
  container.innerHTML = '⏳ กำลังโหลด...';
  
  try {
    const res = await apiFetch(`${API_URL}?action=getStudents`, {}, 7000, 'กำลังดึงรายชื่อนักเรียน...');
    const data = await res.json();
    
    container.innerHTML = '';
    for (const year in data) {
      const div = document.createElement('div');
      div.className = 'accordion-item';
      div.innerHTML = `
        <div class="accordion-header">${year} (${data[year].length} คน)</div>
        <div class="accordion-body">
          ${data[year].map(n => `
            <div class="student-row">
              <span>${n}</span>
              ${ADMIN_ROLE !== 'viewer' ? `<button class="btn-delete" data-year="${year}" data-name="${n.replace(/"/g, '&quot;')}">🗑️</button>` : ''}
            </div>`).join('')}
        </div>`;
      container.appendChild(div);
    }
    
    container.querySelectorAll('.accordion-header').forEach(header => {
      header.onclick = function() {
        this.nextElementSibling.classList.toggle('open');
      };
    });
    
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.onclick = function(){ deleteStudent(this.dataset.year, this.dataset.name); };
    });
    
  } catch (e) {
    container.innerHTML = 'เกิดข้อผิดพลาด';
  }
}

async function addStudent() {
  if (ADMIN_ROLE === 'viewer') return Swal.fire('ไม่มีสิทธิ์', '', 'warning');
  
  const year = document.getElementById('addYear').value;
  const name = document.getElementById('addName').value.trim();
  
  if (!name) return Swal.fire('แจ้งเตือน', 'กรุณากรอกชื่อ', 'warning');
  
  const params = new URLSearchParams({ action: 'addStudent', email: ADMIN_EMAIL, year, name });
  const res = await apiFetch(API_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const result = await res.json();
  
  Swal.fire(result.status === 'success' ? 'สำเร็จ' : 'ผิดพลาด', result.message, result.status === 'success' ? 'success' : 'error');
  document.getElementById('addName').value = '';
  loadStudents();
}

async function deleteStudent(year, name) {
  if (ADMIN_ROLE === 'viewer') return;
  
  const conf = await Swal.fire({ title: `ลบ ${name}?`, showCancelButton: true, confirmButtonText: 'ลบ', confirmButtonColor: '#d33' });
  if (!conf.isConfirmed) return;
  
  const params = new URLSearchParams({ action: 'deleteStudent', email: ADMIN_EMAIL, year, name });
  await apiFetch(API_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  loadStudents();
}

// ===============================================
// ADMIN MANAGEMENT (Superadmin)
// ===============================================
async function loadAdmins() {
  if (ADMIN_ROLE !== 'superadmin') {
    Swal.fire('ไม่มีสิทธิ์', '', 'warning');
    return;
  }
  
  const container = document.getElementById('adminListContainer');
  if (!container) return;
  
  container.innerHTML = '⏳ กำลังโหลด...';
  
  try {
    const res = await apiFetch(`${API_URL}?action=getAdmins&email=${encodeURIComponent(ADMIN_EMAIL)}`, {}, 7000, 'กำลังดึงรายชื่อ Admin...');
    const data = await res.json();
    
    container.innerHTML = `
      <table>
        <thead><tr><th>Email</th><th>ชื่อ</th><th>ยศ</th><th>จัดการ</th></tr></thead>
        <tbody>${data.map(a => `
          <tr>
            <td>${a.email}</td>
            <td>${a.name}</td>
            <td><span class="role-badge role-${a.role}">${roleLabel(a.role)}</span></td>
            <td>
              <button onclick="editAdminRole('${a.email}', '${a.role}')" style="font-size:12px;padding:4px 8px;margin-right:4px;">✏️ แก้ไข</button>
              <button onclick="deleteAdmin('${a.email}')" class="btn-delete" style="font-size:12px;padding:4px 8px;">🗑️ ลบ</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    container.innerHTML = 'เกิดข้อผิดพลาด';
  }
}

async function addAdminUser() {
  if (ADMIN_ROLE !== 'superadmin') return;
  
  const { value: form } = await Swal.fire({
    title: '➕ เพิ่ม Admin',
    html: `
      <input id="a-email" class="swal2-input" placeholder="Email">
      <input id="a-name"  class="swal2-input" placeholder="ชื่อ-นามสกุล">
      <input id="a-password" class="swal2-input" type="password" placeholder="รหัสผ่าน">
      <select id="a-role" class="swal2-input">
        <option value="viewer">Viewer</option>
        <option value="admin">Admin</option>
        <option value="superadmin">Super Admin</option>
      </select>`,
    showCancelButton: true,
    confirmButtonText: 'เพิ่ม',
    preConfirm: () => ({
      newEmail: document.getElementById('a-email').value,
      newName: document.getElementById('a-name').value,
      newPassword: document.getElementById('a-password').value,
      newRole: document.getElementById('a-role').value
    })
  });
  
  if (!form || !form.newEmail || !form.newPassword) return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
  
  const params = new URLSearchParams({ action: 'addAdmin', email: ADMIN_EMAIL, ...form });
  const res = await apiFetch(API_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const result = await res.json();
  
  Swal.fire(result.status === 'success' ? 'สำเร็จ' : 'ผิดพลาด', result.message, result.status === 'success' ? 'success' : 'error');
  loadAdmins();
}

async function editAdminRole(targetEmail, currentRole) {
  if (ADMIN_ROLE !== 'superadmin') return;
  
  const { value: newRole } = await Swal.fire({
    title: `เปลี่ยนยศ ${targetEmail}`,
    input: 'select',
    inputOptions: { viewer: 'Viewer', admin: 'Admin', superadmin: 'Super Admin' },
    inputValue: currentRole,
    showCancelButton: true
  });
  
  if (!newRole || newRole === currentRole) return;
  
  const params = new URLSearchParams({ action: 'editAdminRole', email: ADMIN_EMAIL, targetEmail, newRole });
  const res = await apiFetch(API_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const result = await res.json();
  
  Swal.fire(result.status === 'success' ? 'สำเร็จ' : 'ผิดพลาด', result.message, result.status === 'success' ? 'success' : 'error');
  loadAdmins();
}

async function deleteAdmin(targetEmail) {
  if (ADMIN_ROLE !== 'superadmin') return;
  
  const conf = await Swal.fire({ title: `ลบ ${targetEmail}?`, showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบ' });
  if (!conf.isConfirmed) return;
  
  const params = new URLSearchParams({ action: 'deleteAdmin', email: ADMIN_EMAIL, targetEmail });
  await apiFetch(API_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  loadAdmins();
}

// ===============================================
// SETTINGS (Superadmin)
// ===============================================
async function loadSettings() {
  try {
    const res = await apiFetch(`${API_URL}?action=getConfig`, {}, 7000, 'กำลังดึงการตั้งค่า...');
    const data = await res.json();
    
    document.getElementById('lat').value = data.lat || '';
    document.getElementById('lng').value = data.lng || '';
    document.getElementById('radius').value = data.radius || 50;
    document.getElementById('alertText').value = data.alertText || '';
    document.getElementById('systemToggle').checked = data.systemOn !== false;
  } catch (e) {
    console.error(e);
  }
}

async function save() {
  if (ADMIN_ROLE !== 'superadmin') return Swal.fire('ไม่มีสิทธิ์', 'ต้องการสิทธิ์ Super Admin', 'warning');
  
  const params = new URLSearchParams({
    action: 'saveConfig',
    email: ADMIN_EMAIL,
    lat: document.getElementById('lat').value,
    lng: document.getElementById('lng').value,
    radius: document.getElementById('radius').value,
    alertText: document.getElementById('alertText').value,
    systemOn: document.getElementById('systemToggle').checked ? 'true' : 'false'
  });
  
  const res = await apiFetch(API_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const result = await res.json();
  
  Swal.fire(result.status === 'success' ? 'บันทึกสำเร็จ' : 'ผิดพลาด', result.message, result.status === 'success' ? 'success' : 'error');
}

function getCurrentLocation() {
  if (ADMIN_ROLE !== 'superadmin') return;
  
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('lat').value = pos.coords.latitude;
    document.getElementById('lng').value = pos.coords.longitude;
    Swal.fire('สำเร็จ', `ดึงพิกัด: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`, 'success');
  }, () => Swal.fire('Error', 'ไม่สามารถดึงพิกัดได้', 'error'), { enableHighAccuracy: true });
}

// ===============================================
// INIT PAGE LOAD
// ===============================================
window.addEventListener('load', function() {
  const savedEmail = localStorage.getItem('adminEmail');
  const savedRole = localStorage.getItem('adminRole');
  const savedName = localStorage.getItem('adminName');
  
  const form = document.getElementById('loginForm');
  const content = document.getElementById('adminContent');
  
  if (savedEmail && savedRole) {
    ADMIN_EMAIL = savedEmail;
    ADMIN_ROLE = savedRole;
    ADMIN_NAME = savedName || '';
    
    if (form) form.style.display = 'none';
    if (content) content.style.display = 'block';
    
    document.getElementById('adminEmailDisplay').textContent = savedEmail;
    document.getElementById('adminRoleDisplay').textContent = `ยศ: ${roleLabel(savedRole)}`;
    
    applyRoleUI();
    loadDashboard();
    show('dashboard');
  } else {
    if (form) form.style.display = 'flex';
    if (content) content.style.display = 'none';
    document.getElementById('loginEmailInput').focus();
  }
});

window.onload = () => {
  show('dashboard');
};