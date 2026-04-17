// ===============================================
// Marine Admin Dashboard - Firebase Logic (FULL)
// ===============================================

const API_URL = "https://script.google.com/macros/s/AKfycbxDmXNNGxCUP3dAvzO2yc5Byx4n71SeieXDeA3Gs3v1tbVo4pscsFgtcibTxDAuZc4/exec";

// 1. การตั้งค่า Firebase (จากโปรเจกต์ login-marine-ca9b7)
const firebaseConfig = {
  apiKey: "AIzaSyAwEOw7c2FRJAf70d6wIN8mgO2at5FYZX0",
  authDomain: "login-marine-ca9b7.firebaseapp.com",
  projectId: "login-marine-ca9b7",
  storageBucket: "login-marine-ca9b7.firebasestorage.app",
  messagingSenderId: "130281276977",
  appId: "1:130281276977:web:e373e6770b32c46ac17710",
  measurementId: "G-9EJP0R9FY1"
};

// 2. เริ่มต้นใช้งาน Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let ADMIN_EMAIL = "";
let ADMIN_ROLE  = "";

// === [ฟังก์ชัน: แสดง/ซ่อน Loading] ===
function showLoadingOverlay(msg = 'กำลังประมวลผล...') {
    let overlay = document.getElementById('globalLoadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'globalLoadingOverlay';
        overlay.style = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Kanit,sans-serif;';
        overlay.innerHTML = `
            <div style="background:#fff;padding:30px;border-radius:12px;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                <div style="border:4px solid #f3f3f3;border-top:4px solid #2563eb;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 15px;"></div>
                <span id='globalLoadingMsg' style="color:#333;font-weight:500;">${msg}</span>
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

// === [ฟังก์ชัน: ระบบ Login] ===
async function handleAdminLogin() {
    const emailInput = document.getElementById('loginEmailInput');
    const passwordInput = document.getElementById('loginPasswordInput');
    const loginError = document.getElementById('loginError');
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        loginError.textContent = "⚠️ กรุณากรอกอีเมลและรหัสผ่าน";
        loginError.style.display = "block";
        return;
    }

    try {
        showLoadingOverlay('กำลังตรวจสอบสิทธิ์...');
        
        // เข้าสู่ระบบด้วย Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // ดึง Role จาก Firestore (คอลเลกชัน admins)
        const userDoc = await db.collection('admins').doc(email).get();
        let role = 'viewer'; // ค่าเริ่มต้นถ้าไม่มีข้อมูลในฐานข้อมูล
        
        if (userDoc.exists) {
            role = userDoc.data().role;
        }

        // เก็บข้อมูลลง LocalStorage เพื่อใช้ใน UI
        localStorage.setItem('marine_admin_email', user.email);
        localStorage.setItem('marine_admin_role', role);
        
        ADMIN_EMAIL = user.email;
        ADMIN_ROLE = role;

        loginSuccessUI(user.email, role);
        
    } catch (error) {
        hideLoadingOverlay();
        console.error("Login Error:", error);
        loginError.textContent = "⚠️ อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        loginError.style.display = "block";
    }
}

// === [ฟังก์ชัน: จัดการหน้าจอเมื่อ Login สำเร็จ] ===
function loginSuccessUI(email, role) {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    
    const emailDisplay = document.getElementById('adminEmailDisplay');
    const roleDisplay = document.getElementById('adminRoleDisplay');
    
    if(emailDisplay) emailDisplay.textContent = email;
    if(roleDisplay) roleDisplay.textContent = `สิทธิ์: ${role.toUpperCase()}`;
    
    hideLoadingOverlay();
    applyRolePermissions(role);
    show('dashboard'); // เปิดหน้าแรก
    
    console.log("Logged in as:", email, "with role:", role);
}

// === [ฟังก์ชัน: แบ่งสิทธิ์การมองเห็นเมนู] ===
function applyRolePermissions(role) {
    const isSuper = (role === 'superadmin');
    
    // รายชื่อ ID ของปุ่มเมนูที่ต้องการจำกัดสิทธิ์
    const restrictedElements = [
        'nav-settings', 
        'nav-adminManage', 
        'nav-adminActivity', 
        'm-nav-settings'
    ];
    
    restrictedElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isSuper ? 'block' : 'none';
    });
}

// === [ฟังก์ชัน: ออกจากระบบ] ===
function handleAdminLogout() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            auth.signOut().then(() => {
                localStorage.clear();
                location.reload();
            });
        }
    });
}

// === [ฟังก์ชัน: เปลี่ยนหน้าเมนู] ===
function show(pageId) {
    // ซ่อนทุกหน้า
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // เอาสถานะ Active ออกจากทุกปุ่ม
    document.querySelectorAll('.nav-btn, .m-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // แสดงหน้าที่เลือก
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    // ใส่สถานะ Active ให้ปุ่มที่กด (ทั้ง Desktop และ Mobile)
    const activeNav = document.getElementById('nav-' + pageId);
    const activeMobileNav = document.getElementById('m-nav-' + pageId);
    if (activeNav) activeNav.classList.add('active');
    if (activeMobileNav) activeMobileNav.classList.add('active');
}

// === [ตรวจสถานะตอนโหลดหน้า] ===
window.addEventListener('load', () => {
    // ฟังก์ชันตรวจสอบจาก Firebase โดยตรง
    auth.onAuthStateChanged((user) => {
        if (user) {
            ADMIN_EMAIL = user.email;
            ADMIN_ROLE = localStorage.getItem('marine_admin_role') || 'viewer';
            loginSuccessUI(user.email, ADMIN_ROLE);
        } else {
            // ถ้าไม่ได้ล็อกอิน ให้แสดงหน้า Login
            document.getElementById('loginForm').style.display = 'flex';
            document.getElementById('adminContent').style.display = 'none';
        }
    });
});