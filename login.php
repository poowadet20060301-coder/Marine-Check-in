<?php
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// 1. ตั้งค่าการเชื่อมต่อ (เช็คจาก Workbench)
$host = "localhost";
$user = "root";
$pass = "20060301"; 
$db   = "admin"; 

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "เชื่อมต่อฐานข้อมูลไม่ได้"]);
    exit;
}

// 2. รับค่าจาก JavaScript
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "กรุณากรอกข้อมูลให้ครบ"]);
    exit;
}

// 3. ค้นหาและตรวจสอบสิทธิ์
$stmt = $conn->prepare("SELECT email, role, name FROM admin WHERE email = ? AND password = SHA2(?, 256)");
$stmt->bind_param("ss", $email, $password);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo json_encode([
        "status" => "success",
        "email" => $user['email'],
        "role" => $user['role'], // superadmin, admin, viewer
        "name" => $user['name']
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "อีเมลหรือรหัสผ่านไม่ถูกต้อง"]);
}

$stmt->close();
$conn->close();
?>