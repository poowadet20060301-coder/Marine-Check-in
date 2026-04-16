// ===============================================
// Marine Admin Dashboard - admin.js V4 (FINAL FIXED)
// ===============================================

const API_URL = "https://script.google.com/macros/s/AKfycbxDmXNNGxCUP3dAvzO2yc5Byx4n71SeieXDeA3Gs3v1tbVo4pscsFgtcibTxDAuZc4/exec";

let ADMIN_EMAIL = "";
let ADMIN_ROLE  = "";
let ADMIN_NAME  = "";
let isProcessing = false; // ป้องกันการกดซ้ำ

// ===== LOADING OVERLAY =====
function showLoadingOverlay(msg = 'กำลังโหลด...') {
  let overlay = document.getElementById('globalLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalLoadingOverlay';
    overlay.style = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
    overlay.innerHTML = `<div style="background:#fff;padding:30px;border-radius:15px;text-align:center;box-shadow:0 10px-25px rgba(0,0,0,0.2);">
      <div class='loader' style='border:5px solid #f3f3f3;border-top:5px solid #001f3f;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 15px;'></div>
      <span id='globalLoadingMsg' style="font-family:Kanit, sans-serif;">${msg}</span>
    </div>`;
    document.body.appendChild(overlay);
    if (!document.getElementById('spinStyle')) {
      const style = document.createElement('style');
      style.id = 'spinStyle';
      style.innerHTML = `@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`;
      document.head.appendChild(style);
    }
  } else {
    overlay.style.display = 'flex';
    document.getElementById('globalLoadingMsg').textContent = msg;
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('globalLoadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ===== FETCH WRAPPER =====
async function apiFetch(url, options = {}, timeout = 10000, loadingMsg = 'กำลังโหลด...') {
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
    if (e.name === 'AbortError') Swal.fire('Timeout', 'การเชื่อมต่อใช้เวลานานเกินไป', 'error');
    else Swal.fire('Error', e.message, 'error');
    throw e;
  }
}

// ===============================================
// AUTHENTICATION
// ===============================================
function handleAdminLogin() {
  const passwordInput = document.getElementById('loginPasswordInput');
  const loginError = document.getElementById('loginError');
  
  const password = passwordInput.value.trim();

  if (!password) {
    loginError.textContent = '⚠️ กรุณากรอกรหัสผ่าน';
    loginError.style.display = 'block';
    passwordInput.focus();
    return;
  }

  if (password === "1234") {
    // รหัสถูกต้อง - เข้าได้เลย
    const data = {
      email: "admin@marine.local",
      role: "superadmin",
      name: "Admin"
    };
    
    localStorage.setItem('adminEmail', data.email);
    localStorage.setItem('adminRole', data.role);
    localStorage.setItem('adminName', data.name);
    
    initSession(data);
    show('dashboard');
  } else {
    // รหัสผิด
    loginError.textContent = '⚠️ รหัสผ่านไม่ถูกต้อง';
    loginError.style.display = 'block';
    loginError.style.color = '#d32f2f';
    passwordInput.value = "";
    passwordInput.focus();
  }
}

function initSession(data) {
  ADMIN_EMAIL = data.email;
  ADMIN_ROLE = data.role;
  ADMIN_NAME = data.name;

  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('adminContent').style.display = 'block';
  document.getElementById('adminEmailDisplay').textContent = ADMIN_EMAIL;
  document.getElementById('adminRoleDisplay').textContent = `ยศ: ${roleLabel(ADMIN_ROLE)}`;
  applyRoleUI();
}

function handleAdminLogout() {
  if (confirm('คุณแน่ใจที่จะออกจากระบบ?')) {
    localStorage.clear();
    location.reload();
  }
}

function roleLabel(role) {
  return { superadmin: 'Super Admin', admin: 'Admin', viewer: 'Viewer' }[role] || role;
}

function applyRoleUI() {
  const isSuper = ADMIN_ROLE === 'superadmin';
  const restrictedElements = ['nav-settings', 'nav-adminManage', 'nav-adminActivity', 'm-nav-settings'];
  restrictedElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isSuper ? '' : 'none';
  });
}

// ===============================================
// NAVIGATION & PAGE LOADING
// ===============================================
function show(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn, .m-nav-btn').forEach(b => b.classList.remove('active'));
  
  const targetPage = document.getElementById(page);
  if (targetPage) targetPage.classList.add('active');
  
  // ไฮไลท์ปุ่มเมนู
  ['nav-', 'm-nav-'].forEach(prefix => {
    const btn = document.getElementById(prefix + page);
    if (btn) btn.classList.add('active');
  });

  // โหลดข้อมูลตามหน้า
  switch(page) {
    case 'dashboard': loadDashboard(); break;
    case 'leaveRequests': loadLeaveRequests(); break;
    case 'logs': 
      const d = document.getElementById('logDate');
      if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
      loadLogs(); 
      break;
    case 'studentManage': loadStudents(); break;
    case 'settings': loadSettings(); break;
    case 'adminManage': loadAdmins(); break;
    case 'adminActivity': loadAdminActivity(); break;
  }
}

// ===============================================
// STUDENT MANAGEMENT (Fixed Accordion)
// ===============================================
async function loadStudents() {
  const container = document.getElementById('studentAccordionContainer');
  container.innerHTML = '<div style="padding:20px; text-align:center;">⏳ กำลังดึงรายชื่อ...</div>';
  
  try {
    const res = await apiFetch(`${API_URL}?action=getStudents`);
    const data = await res.json();
    
    container.innerHTML = '';
    for (const year in data) {
      const section = document.createElement('div');
      section.className = 'accordion-item';
      section.style = 'border:1px solid #ddd; margin-bottom:10px; border-radius:8px; overflow:hidden;';
      
      section.innerHTML = `
        <div class="accordion-header" style="background:#f8f9fa; padding:15px; cursor:pointer; font-weight:bold; display:flex; justify-content:space-between;">
          <span>📂 ${year} (${data[year].length} คน)</span>
          <span class="icon">➕</span>
        </div>
        <div class="accordion-body" style="display:none; padding:10px; background:#fff; border-top:1px solid #eee;">
          ${data[year].map(n => `
            <div class="student-row" style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #fafafa;">
              <span>${n}</span>
              ${ADMIN_ROLE !== 'viewer' ? `<button onclick="deleteStudent('${year}', '${n.replace(/'/g, "\\'")}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>` : ''}
            </div>`).join('')}
        </div>`;
      
      section.querySelector('.accordion-header').onclick = function() {
        const body = this.nextElementSibling;
        const icon = this.querySelector('.icon');
        const isOpen = body.style.display === 'block';
        body.style.display = isOpen ? 'none' : 'block';
        icon.textContent = isOpen ? '➕' : '➖';
      };
      
      container.appendChild(section);
    }
  } catch (e) {
    container.innerHTML = '<div style="color:red; padding:20px;">❌ เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
  }
}

// ===============================================
// CORE FUNCTIONS (Dashboard, Tracking, etc.)
// ===============================================
async function loadDashboard() {
  try {
    const res = await apiFetch(`${API_URL}?action=getDashboard&email=${encodeURIComponent(ADMIN_EMAIL)}`);
    const data = await res.json();
    for (let i = 1; i <= 4; i++) {
      const d = data[`ปี ${i}`] || { present: 0, late: 0, leave: 0, absent: 0 };
      setText(`y${i}-present`, d.present);
      setText(`y${i}-late`, d.late);
      setText(`y${i}-leave`, d.leave);
      setText(`y${i}-absent`, d.absent);
    }
  } catch (e) { console.error("Dashboard error", e); }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || 0;
}

async function trackAdminLogin(email, role, action) {
  if (!email) return;
  const params = new URLSearchParams({ 
    action: 'trackAdminActivity', 
    email, role, actType: action,
    timestamp: new Date().toLocaleString('th-TH') 
  });
  fetch(API_URL, { method: 'POST', body: params }).catch(e => console.error(e));
}

// ===============================================
// INITIALIZE
// ===============================================
window.addEventListener('load', function() {
  const savedEmail = localStorage.getItem('adminEmail');
  const savedRole = localStorage.getItem('adminRole');
  const savedName = localStorage.getItem('adminName');
  
  if (savedEmail && savedRole) {
    initSession({ email: savedEmail, role: savedRole, name: savedName });
    show('dashboard');
  } else {
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('adminContent').style.display = 'none';
  }
});