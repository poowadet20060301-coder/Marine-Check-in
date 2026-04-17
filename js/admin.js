// ===============================================
// Marine Admin Dashboard - Firebase Version
// ===============================================

// 1. Firebase Configuration (ค่าที่คุณส่งมา)
const firebaseConfig = {
  apiKey: "AIzaSyAwEOw7c2FRJAf70d6wIN8mgO2at5FYZX0",
  authDomain: "login-marine-ca9b7.firebaseapp.com",
  projectId: "login-marine-ca9b7",
  storageBucket: "login-marine-ca9b7.firebasestorage.app",
  messagingSenderId: "130281276977",
  appId: "1:130281276977:web:e373e6770b32c46ac17710",
  measurementId: "G-9EJP0R9FY1"
};

// 2. Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let ADMIN_EMAIL = "";
let ADMIN_ROLE  = "";

// ===== LOADING OVERLAY =====
function showLoadingOverlay(msg = 'กำลังประมวลผล...') {
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

// ===============================================
// LOGIN SYSTEM (FIREBASE AUTH)
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
        showLoadingOverlay('กำลังตรวจสอบสิทธิ์...');
        
        // เข้าสู่ระบบด้วย Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // ดึง Role จาก Firestore Collection "admins" (ถ้ามี)
        // หมายเหตุ: คุณต้องไปสร้าง Collection ชื่อ 'admins' และสร้าง Doc ตามชื่อ email ใน Firebase ด้วย
        const userDoc = await db.collection('admins').doc(email).get();
        let role = 'viewer'; 
        if (userDoc.exists) {
            role = userDoc.data().role;
        }

        // เก็บข้อมูลลง LocalStorage
        localStorage.setItem('adminEmail', user.email);
        localStorage.setItem('adminRole', role);
        
        ADMIN_EMAIL = user.email;
        ADMIN_ROLE = role;

        // เปลี่ยนหน้าจอ
        loginSuccessUI(user.email);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error("Login Error:", error);
        let errorMsg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        if(error.code === 'auth/user-not-found') errorMsg = "ไม่พบผู้ใช้งานนี้";
        if(error.code === 'auth/wrong-password') errorMsg = "รหัสผ่านผิด";
        
        Swal.fire('เข้าสู่ระบบไม่สำเร็จ', errorMsg, 'error');
    }
}

function loginSuccessUI(email) {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('adminEmailDisplay').textContent = email;
    hideLoadingOverlay();
    applyRoleUI();
    loadDashboard();
    show('dashboard');
}

function handleAdminLogout() {
    if (confirm('ยืนยันการออกจากระบบ?')) {
        auth.signOut().then(() => {
            localStorage.clear();
            location.reload();
        });
    }
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
// NAVIGATION & DASHBOARD (ดึงข้อมูลจาก FIRESTORE)
// ===============================================
function show(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn, .m-nav-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(page);
    if (target) target.classList.add('active');
}

async function loadDashboard() {
    // ส่วนนี้คุณสามารถเปลี่ยนไปใช้การดึงข้อมูลจาก Firestore แทน Google Sheets ได้ในอนาคต
    console.log("Dashboard Loaded for:", ADMIN_EMAIL);
}

// ===============================================
// INITIALIZE
// ===============================================
window.addEventListener('load', function() {
    // ตรวจสอบสถานะการล็อกอินจาก Firebase โดยตรง
    auth.onAuthStateChanged((user) => {
        if (user) {
            ADMIN_EMAIL = user.email;
            ADMIN_ROLE = localStorage.getItem('adminRole') || 'viewer';
            loginSuccessUI(user.email);
        }
    });
});