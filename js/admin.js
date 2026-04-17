// ===============================================
// Marine Admin Dashboard - Firebase Logic
// ===============================================

// ตัวแปร App Script URL (ใส่ของคุณที่นี่เพื่อให้ระบบดึงข้อมูลได้)
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDmXNNGxCUP3dAvzO2yc5Byx4n71SeieXDeA3Gs3v1tbVo4pscsFgtcibTxDAuZc4/exec";

const firebaseConfig = {
  apiKey: "AIzaSyAwEOw7c2FRJAf70d6wIN8mgO2at5FYZX0",
  authDomain: "login-marine-ca9b7.firebaseapp.com",
  projectId: "login-marine-ca9b7",
  storageBucket: "login-marine-ca9b7.firebasestorage.app",
  messagingSenderId: "130281276977",
  appId: "1:130281276977:web:e373e6770b32c46ac17710"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

let ADMIN_EMAIL = "";
let ADMIN_ROLE = "";

// ฟังก์ชัน: เข้าสู่ระบบ
async function handleAdminLogin() {
    const email = document.getElementById('loginEmailInput').value.trim();
    const password = document.getElementById('loginPasswordInput').value.trim();
    const errorDiv = document.getElementById('loginError');

    if (!email || !password) {
        errorDiv.textContent = "⚠️ กรุณากรอกอีเมลและรหัสผ่าน";
        errorDiv.style.display = "block";
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // ดึงสิทธิ์จาก Firestore
        const userDoc = await db.collection('admins').doc(email).get();
        let role = userDoc.exists ? userDoc.data().role : 'viewer';

        localStorage.setItem('admin_role', role);
        loginSuccessUI(user.email, role);
    } catch (error) {
        console.error(error);
        errorDiv.textContent = "❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        errorDiv.style.display = "block";
    }
}

// ฟังก์ชัน: จัดการหน้าจอเมื่อ Login สำเร็จ
function loginSuccessUI(email, role) {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    
    const emailDisplay = document.getElementById('adminEmailDisplay');
    const roleDisplay = document.getElementById('adminRoleDisplay');
    
    if(emailDisplay) emailDisplay.textContent = email;
    if(roleDisplay) roleDisplay.textContent = `สิทธิ์: ${role.toUpperCase()}`;
    
    applyRolePermissions(role);
    show('dashboard'); 
    
    // เรียกโหลดข้อมูลจาก App Script เมื่อเข้าสู่ระบบสำเร็จ
    // loadDataFromAppScript(); 
}

// ฟังก์ชัน: แบ่งสิทธิ์เมนู
function applyRolePermissions(role) {
    const isSuper = (role === 'superadmin');
    const restrictedElements = ['nav-settings', 'nav-adminManage', 'nav-adminActivity'];
    
    restrictedElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isSuper ? 'block' : 'none';
    });
}

// ฟังก์ชัน: เปลี่ยนหน้า
function show(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    const activeNav = document.querySelector(`.nav-btn[onclick="show('${pageId}')"]`);
    if (activeNav) activeNav.classList.add('active');
}

// ฟังก์ชัน: ออกจากระบบ
function handleAdminLogout() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
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

// ตรวจสอบสถานะล็อกอินอัตโนมัติ
auth.onAuthStateChanged((user) => {
    if (user) {
        const role = localStorage.getItem('admin_role') || 'viewer';
        loginSuccessUI(user.email, role);
    } else {
        document.getElementById('loginForm').style.display = 'flex';
        document.getElementById('adminContent').style.display = 'none';
    }
});