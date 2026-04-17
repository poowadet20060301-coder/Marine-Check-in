// ===============================================
// Marine Admin Dashboard - admin.js (FIXED FOR VERCEL)
// ===============================================

// ตรวจสอบและประกาศ API_URL เพียงครั้งเดียว
if (typeof API_URL === 'undefined') {
    var API_URL = "https://script.google.com/macros/s/AKfycbxDmXNNGxCUP3dAvzO2yc5Byx4n71SeieXDeA3Gs3v1tbVo4pscsFgtcibTxDAuZc4/exec";
}

let ADMIN_EMAIL = "";
let ADMIN_ROLE  = "";
let ADMIN_NAME  = "";

// ===== LOADING OVERLAY (แสดงตอนรอข้อมูล) =====
function showLoadingOverlay(msg = 'กำลังโหลด...') {
    let overlay = document.getElementById('globalLoadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'globalLoadingOverlay';
        overlay.style = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
        overlay.innerHTML = `<div style="background:#fff;padding:30px;border-radius:12px;text-align:center;">
            <div style="border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 10px;"></div>
            <span id='globalLoadingMsg'>${msg}</span>
        </div>`;
        document.body.appendChild(overlay);
        const style = document.createElement('style');
        style.innerHTML = `@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`;
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

// ===== API FETCH (รองรับ CORS บน VERCEL) =====
async function apiFetch(url, options = {}, timeout = 8000) {
    showLoadingOverlay();
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
        throw e;
    }
}

// ===============================================
// LOGIN SYSTEM (แก้ไขให้ทำงานร่วมกับปุ่มใน HTML)
// ===============================================
async function handleAdminLogin() {
    const emailInput = document.getElementById('loginEmailInput');
    const passwordInput = document.getElementById('loginPasswordInput');
    const loginError = document.getElementById('loginError');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        if (loginError) {
            loginError.textContent = "⚠️ กรุณากรอก Email และ Password";
            loginError.style.display = "block";
        }
        return;
    }

    try {
        const response = await apiFetch(`${API_URL}?action=verifyAdmin&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
        const data = await response.json();

        if (data.status === 'success') {
            localStorage.setItem('adminEmail', data.email);
            localStorage.setItem('adminRole', data.role);
            
            ADMIN_EMAIL = data.email;
            ADMIN_ROLE = data.role;

            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('adminContent').style.display = 'block';
            document.getElementById('adminEmailDisplay').textContent = data.email;
            
            applyRoleUI();
            loadDashboard();
            show('dashboard');
        } else {
            Swal.fire('ผิดพลาด', data.message || 'ข้อมูลไม่ถูกต้อง', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
}

function handleAdminLogout() {
    if (confirm('ยืนยันการออกจากระบบ?')) {
        localStorage.clear();
        location.reload();
    }
}

function roleLabel(role) {
    const labels = { superadmin: 'Super Admin', admin: 'Admin', viewer: 'Viewer' };
    return labels[role] || role;
}

function applyRoleUI() {
    const isSuper = ADMIN_ROLE === 'superadmin';
    const restricted = ['nav-settings', 'nav-adminManage', 'nav-adminActivity', 'm-nav-settings'];
    restricted.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isSuper ? '' : 'none';
    });
}

// ===============================================
// NAVIGATION & DASHBOARD
// ===============================================
function show(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn, .m-nav-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(page);
    if (target) target.classList.add('active');

    if (page === 'dashboard') loadDashboard();
}

async function loadDashboard() {
    try {
        const res = await apiFetch(`${API_URL}?action=getDashboard&email=${encodeURIComponent(ADMIN_EMAIL)}`);
        const data = await res.json();
        // อัปเดตตัวเลขบนหน้าจอ (y1-present, y1-late, ฯลฯ)
        for (let i = 1; i <= 4; i++) {
            const d = data[`ปี ${i}`] || { present: 0, late: 0, leave: 0, absent: 0 };
            ['present', 'late', 'leave', 'absent'].forEach(s => {
                const el = document.getElementById(`y${i}-${s}`);
                if (el) el.textContent = d[s];
            });
        }
    } catch (e) { console.error(e); }
}

// ===============================================
// INITIALIZE
// ===============================================
window.addEventListener('load', function() {
    const savedEmail = localStorage.getItem('adminEmail');
    const savedRole = localStorage.getItem('adminRole');

    if (savedEmail && savedRole) {
        ADMIN_EMAIL = savedEmail;
        ADMIN_ROLE = savedRole;
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        document.getElementById('adminEmailDisplay').textContent = savedEmail;
        applyRoleUI();
        show('dashboard');
    }
});