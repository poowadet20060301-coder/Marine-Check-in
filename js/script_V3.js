// ===============================================
// Marine Check-in System - Frontend Script V3
// GPS Anti-spoof + iOS Support
// ===============================================

const API_URL = "https://script.google.com/macros/s/AKfycbzJLEHBghl2kgi2D0F59QKgVU1c5_M6aZ_of55YjzxKIAXZECPTxEU4smI7qOnWZ0Q/exec";

const video         = document.getElementById('webcam');
const checkBtn      = document.getElementById('checkBtn');
const leaveBtn      = document.getElementById('leaveBtn');
const btnText       = document.getElementById('btnText');
const yearSelect    = document.getElementById("year");
const studentSelect = document.getElementById("student");

let isLoading = false;

// ===============================================
// 1. เปิดกล้อง
// ===============================================
navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
  .then(stream => video.srcObject = stream)
  .catch(() => Swal.fire('Error', 'กรุณาอนุญาตให้เข้าถึงกล้อง', 'error'));

// ===============================================
// 2. โหลดรายชื่อแยกตามปี
// ===============================================
yearSelect.addEventListener("change", async function () {
  const year = this.value;
  if (!year) return;
  studentSelect.innerHTML = '<option value="">⏳ กำลังโหลดรายชื่อ...</option>';
  try {
    const res  = await fetch(`${API_URL}?action=getStudents`);
    const data = await res.json();
    studentSelect.innerHTML = '<option value="">-- เลือกชื่อของคุณ --</option>';
    if (data[year] && data[year].length > 0) {
      data[year].forEach(name => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = name;
        studentSelect.appendChild(opt);
      });
    } else {
      studentSelect.innerHTML = '<option value="">ไม่มีรายชื่อในชั้นปีนี้</option>';
    }
  } catch (e) {
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    studentSelect.innerHTML = '<option value="">เกิดข้อผิดพลาด</option>';
  }
});

// ===============================================
// 3. ดึง GPS (iOS-safe + Anti-spoof)
// ===============================================
function getGPSPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("อุปกรณ์ไม่รองรับ GPS");
      return;
    }

    // iOS ต้องการ enableHighAccuracy: true เสมอ
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0          // ห้ามใช้ cache GPS (ป้องกัน spoof)
    };

    // ดึง GPS 2 ครั้ง เปรียบเทียบความสอดคล้อง (anti-spoof)
    let firstPos = null;

    navigator.geolocation.getCurrentPosition(
      (pos1) => {
        firstPos = pos1;
        // ดึงครั้งที่ 2 ห่าง 1.5 วินาที
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              const latDiff = Math.abs(pos1.coords.latitude  - pos2.coords.latitude);
              const lngDiff = Math.abs(pos1.coords.longitude - pos2.coords.longitude);

              // ถ้าพิกัดต่างกันเกิน 0.001 องศา (~100m) ใน 1.5 วิ = GPS ผิดปกติ
              if (latDiff > 0.001 || lngDiff > 0.001) {
                reject("ตรวจพบ GPS ที่ผิดปกติ กรุณาปิด VPN หรือแอปปลอม GPS แล้วลองใหม่");
                return;
              }

              resolve(pos2.coords);
            },
            (err) => resolve(firstPos.coords), // ถ้าครั้งที่ 2 ล้มเหลว ใช้ครั้งแรก
            options
          );
        }, 1500);
      },
      (err) => {
        // แปลง error code ให้อ่านง่าย
        const msgs = {
          1: "กรุณาอนุญาตการเข้าถึง GPS ในการตั้งค่า (Settings > Safari > Location)",
          2: "ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS และออกไปพื้นที่โล่ง",
          3: "GPS ใช้เวลานานเกินไป กรุณาลองใหม่"
        };
        reject(msgs[err.code] || "เกิดข้อผิดพลาด GPS");
      },
      options
    );
  });
}

// ===============================================
// 4. เช็คชื่อ
// ===============================================
checkBtn.onclick = async () => {
  if (isLoading) return;

  const year = yearSelect.value;
  const name = studentSelect.value;

  if (!year || !name) {
    return Swal.fire('แจ้งเตือน', 'กรุณาเลือกปีและรายชื่อ', 'warning');
  }

  setLoading(true, '📡 กำลังดึง GPS...');

  try {
    // ดึง GPS และ IP พร้อมกัน
    let coords, ipData;

    try {
      [coords, ipData] = await Promise.all([
        getGPSPosition(),
        fetch('https://api.ipify.org?format=json').then(r => r.json()).catch(() => ({ ip: 'Unknown' }))
      ]);
    } catch (gpsErr) {
      setLoading(false);
      return Swal.fire({
        icon: 'warning',
        title: 'GPS ไม่พร้อม',
        text: gpsErr.toString(),
        confirmButtonText: 'ตกลง'
      });
    }

    setLoading(true, '📸 กำลังถ่ายรูป...');

    // ถ่ายรูป
    const canvas = document.createElement("canvas");
    canvas.width  = 400;
    canvas.height = 300;
    canvas.getContext("2d").drawImage(video, 0, 0, 400, 300);

    setLoading(true, '⏳ กำลังบันทึก...');

    const params = new URLSearchParams();
    params.append("action",   "checkIn");
    params.append("name",     name);
    params.append("year",     year);
    params.append("imageData", canvas.toDataURL("image/jpeg", 0.8));
    params.append("userIP",   ipData.ip);
    params.append("lat",      coords.latitude);
    params.append("lng",      coords.longitude);
    params.append("accuracy", coords.accuracy); // ส่ง accuracy ไปตรวจด้วย

    const response = await fetch(API_URL, {
      method: "POST",
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const result = await response.json();

    if (result.status === "success") {
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: result.message,
        confirmButtonText: 'ตกลง'
      }).then(() => {
        yearSelect.value = '';
        studentSelect.innerHTML = '<option value="">เลือกรายชื่อ</option>';
      });
    } else {
      Swal.fire('แจ้งเตือน', result.message || 'เกิดข้อผิดพลาด', 'warning');
    }

  } catch (err) {
    console.error(err);
    Swal.fire('ผิดพลาด', err.toString(), 'error');
  } finally {
    setLoading(false);
  }
};

// ===============================================
// 5. Loading State
// ===============================================
function setLoading(status, text = '🚀 เช็คชื่อเข้าแถว') {
  isLoading = status;
  checkBtn.disabled = status;
  leaveBtn.disabled = status;
  if (status) {
    btnText.innerHTML = `<span class="spinner"></span> ${text}`;
    checkBtn.style.opacity = '0.7';
  } else {
    btnText.innerHTML = '🚀 เช็คชื่อเข้าแถว';
    checkBtn.style.opacity = '1';
  }
}

// ===============================================
// 6. แจ้งลา
// ===============================================
leaveBtn.onclick = async () => {
  const year = yearSelect.value;
  const name = studentSelect.value;
  if (!year || !name) {
    return Swal.fire('แจ้งเตือน', 'กรุณาเลือกปีและรายชื่อก่อน', 'warning');
  }

  const { value: formValues } = await Swal.fire({
    title: '📝 แจ้งลาเข้าแถว',
    html: `
      <input id="swal-reason" class="swal2-input" placeholder="ระบุเหตุผลการลา" style="width:80%">
      <input type="file" id="swal-file" class="swal2-file" accept="image/*" style="margin-top:10px">
    `,
    showCancelButton: true,
    confirmButtonText: 'ส่งใบลา',
    cancelButtonText: 'ยกเลิก',
    preConfirm: () => {
      const reason = document.getElementById('swal-reason').value;
      const file   = document.getElementById('swal-file').files[0];
      if (!reason) { Swal.showValidationMessage('กรุณาระบุเหตุผล'); return false; }
      return { reason, file };
    }
  });

  if (!formValues) return;

  setLoading(true, '⏳ กำลังส่งใบลา...');
  try {
    let base64 = "";
    if (formValues.file) {
      base64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.readAsDataURL(formValues.file);
      });
    }
    const params = new URLSearchParams();
    params.append("action",    "submitLeave");
    params.append("year",      year);
    params.append("name",      name);
    params.append("reason",    formValues.reason);
    params.append("imageData", base64);

    const response = await fetch(API_URL, {
      method: "POST", body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const result = await response.json();

    Swal.fire({
      icon: result.status === "success" ? 'success' : 'error',
      title: result.status === "success" ? 'สำเร็จ' : 'ผิดพลาด',
      text: result.message
    }).then(() => {
      yearSelect.value = '';
      studentSelect.innerHTML = '<option value="">เลือกรายชื่อ</option>';
    });
  } catch (err) {
    Swal.fire('ผิดพลาด', 'ไม่สามารถส่งใบลาได้', 'error');
  } finally {
    setLoading(false);
  }
};