// ===============================================
// Marine Admin Dashboard - Firebase Logic (FINAL VERSION)
// ===============================================
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwEOw7c2FRJAf70d6wIN8mgO2at5FYZX0",
  authDomain: "login-marine-ca9b7.firebaseapp.com",
  projectId: "login-marine-ca9b7",
  storageBucket: "login-marine-ca9b7.firebasestorage.app",
  messagingSenderId: "130281276977",
  appId: "1:130281276977:web:e373e6770b32c46ac17710"
};

// Initialize
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

// Function: Login
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
        // ล็อกอินผ่าน Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // ดึงสิทธิ์จาก Firestore Collection "admins" (อ้างอิงตามรูป image_2e59c1.png)
        const userDoc = await db.collection('admins').doc(email).get();
        let role = userDoc.exists ? userDoc.data().role : 'viewer';

        localStorage.setItem('admin_role', role);
        loginSuccess(user.email, role);
    } catch (error) {
        console.error(error);
        errorDiv.textContent = "❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        errorDiv.style.display = "block";
    }
}

function loginSuccess(email, role) {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('adminEmailDisplay').textContent = email + " (" + role + ")";
}

function handleAdminLogout() {
    auth.signOut().then(() => {
        localStorage.clear();
        location.reload();
    });
}

// ตรวจสอบสถานะการล็อกอินอัตโนมัติ
auth.onAuthStateChanged(user => {
    if (user) {
        const role = localStorage.getItem('admin_role') || 'viewer';
        loginSuccess(user.email, role);
    } else {
        document.getElementById('loginForm').style.display = 'flex';
        document.getElementById('adminContent').style.display = 'none';
    }
});
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
}

// === [ฟังก์ชัน: แบ่งสิทธิ์การมองเห็นเมนู] ===
function applyRolePermissions(role) {
    const isSuper = (role === 'superadmin');
    
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
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-btn, .m-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    const activeNav = document.getElementById('nav-' + pageId);
    const activeMobileNav = document.getElementById('m-nav-' + pageId);
    if (activeNav) activeNav.classList.add('active');
    if (activeMobileNav) activeMobileNav.classList.add('active');
}

// === [ตรวจสถานะตอนโหลดหน้า] ===
window.addEventListener('load', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            ADMIN_EMAIL = user.email;
            // ดึง Role ล่าสุดจาก LocalStorage
            ADMIN_ROLE = localStorage.getItem('marine_admin_role') || 'viewer';
            loginSuccessUI(user.email, ADMIN_ROLE);
        } else {
            document.getElementById('loginForm').style.display = 'flex';
            document.getElementById('adminContent').style.display = 'none';
        }
    });
});