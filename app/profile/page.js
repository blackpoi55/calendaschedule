"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
  });

  // Change Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const t = localStorage.getItem("auth_user");
    if (t) {
      try {
        const u = JSON.parse(t);
        setUser(u);
        setFormData({ name: u.name || "" });
      } catch (e) {
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    Swal.fire({
      title: "ออกจากระบบ?",
      text: "คุณต้องการออกจากระบบใช่หรือไม่",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        router.push("/login");
      }
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    // TODO: เชื่อมต่อ API อัปเดตข้อมูลผู้ใช้จริงตรงนี้
    // const res = await updateUser({ name: formData.name });

    // จำลองการบันทึกสำเร็จ
    const newUser = { ...user, name: formData.name };
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    setUser(newUser);
    setIsEditing(false);

    Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      text: "ข้อมูลส่วนตัวถูกแก้ไขแล้ว",
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Swal.fire("รหัสผ่านไม่ตรงกัน", "กรุณากรอกรหัสผ่านใหม่ให้ตรงกัน", "error");
      return;
    }

    // TODO: เชื่อมต่อ API เปลี่ยนรหัสผ่านจริงตรงนี้
    // const res = await changePassword({ ... });

    Swal.fire({
      icon: "success",
      title: "เปลี่ยนรหัสผ่านสำเร็จ",
      text: "รหัสผ่านของคุณถูกเปลี่ยนแปลงแล้ว",
      timer: 1500,
      showConfirmButton: false
    });
    setShowPasswordForm(false);
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa] via-[#fce4ec] to-[#ede7f6] p-4 md:p-8 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCircleIcon className="w-8 h-8" />
            โปรไฟล์ของฉัน
          </h1>
          <button
            onClick={() => router.push("/")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition"
            title="กลับหน้าหลัก"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Profile Info & Edit Name */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative shrink-0">
              {user.image ? (
                <div
                  className="w-24 h-24 rounded-full border-4 border-purple-100 shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: user.image }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-200 to-indigo-200 flex items-center justify-center text-purple-700 text-4xl font-bold shadow-lg border-4 border-white">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>

            <div className="flex-1 w-full text-center md:text-left">
              {!isEditing ? (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2">
                    {user.name}
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-purple-600 transition">
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </h2>
                  <p className="text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-1">@{user.username || "username"}</p>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-600">แก้ไขชื่อ</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border rounded-lg px-3 py-2 focus:ring focus:ring-purple-300"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      autoFocus
                    />
                    <button type="submit" className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="p-2 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <hr />

          {/* Change Password Section */}
          <div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-2 text-indigo-600 font-semibold hover:underline"
            >
              <KeyIcon className="w-5 h-5" />
              {showPasswordForm ? "ยกเลิกการเปลี่ยนรหัสผ่าน" : "เปลี่ยนรหัสผ่าน"}
            </button>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 animate-fade-in-down">
                <div>
                  <label className="block text-sm font-medium mb-1">รหัสผ่านปัจจุบัน</label>
                  <input type="password" required className="w-full border rounded-lg px-3 py-2"
                    value={passwordData.currentPassword} onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">รหัสผ่านใหม่</label>
                  <input type="password" required className="w-full border rounded-lg px-3 py-2"
                    value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่านใหม่</label>
                  <input type="password" required className="w-full border rounded-lg px-3 py-2"
                    value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
                </div>
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                  บันทึกรหัสผ่านใหม่
                </button>
              </form>
            )}
          </div>

          {/* Logout */}
          <div className="pt-4 border-t">
            <button onClick={handleLogout} className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold flex items-center justify-center gap-2 transition duration-200">
              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
