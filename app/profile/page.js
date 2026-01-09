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
  XMarkIcon,
  PaperAirplaneIcon
} from "@heroicons/react/24/solid";
import { edituser } from "@/action/api";

const MARVEL_AVATARS = [
  // 1. Iron Man Style: Red background, Gold mask, Blue arc reactor glow
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#b71c1c"/><path d="M10 9C10 9 10 28 18 28C26 28 26 9 26 9H10Z" fill="#ffc107"/><rect x="12" y="15" width="4" height="1.5" fill="white"/><rect x="20" y="15" width="4" height="1.5" fill="white"/><circle cx="18" cy="31" r="2" fill="#4fc3f7"/></svg>`,

  // 2. Captain America Style: Blue background, Shield pattern (Star)
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#1565c0"/><circle cx="18" cy="18" r="13" fill="#b71c1c"/><circle cx="18" cy="18" r="9" fill="#eeeeee"/><circle cx="18" cy="18" r="5" fill="#1565c0"/><path d="M18 14L19.2 16.5H22L20 18L20.8 20.5L18 19L15.2 20.5L16 18L14 16.5H16.8L18 14Z" fill="white"/></svg>`,

  // 3. Spider-Man Style: Red background, Web lines, Big white eyes
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#d32f2f"/><path d="M18 4V32M4 18H32" stroke="#b71c1c" stroke-width="1" opacity="0.5"/><path d="M11 14C11 14 9 18 12 21C15 24 18 20 18 20" fill="white" stroke="#212121" stroke-width="1.5"/><path d="M25 14C25 14 27 18 24 21C21 24 18 20 18 20" fill="white" stroke="#212121" stroke-width="1.5"/></svg>`,

  // 4. Hulk Style: Green background, Angry hair/brows
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#43a047"/><path d="M8 14C8 14 10 8 18 8C26 8 28 14 28 14" stroke="#212121" stroke-width="6" stroke-linecap="round"/><path d="M12 20L15 22M24 20L21 22" stroke="#1b5e20" stroke-width="2" stroke-linecap="round"/><rect x="14" y="26" width="8" height="2" rx="1" fill="#1b5e20"/></svg>`,

  // 5. Black Panther Style: Dark background, Necklace spikes
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#212121"/><path d="M11 10L12 16M25 10L24 16" stroke="#9e9e9e" stroke-width="2"/><circle cx="13" cy="19" r="1.5" fill="white"/><circle cx="23" cy="19" r="1.5" fill="white"/><path d="M12 28L15 25L18 28L21 25L24 28" stroke="#bdbdbd" stroke-width="2" stroke-linejoin="round" fill="none"/></svg>`,

  // 6. Deadpool Style: Red background, Black eye patches
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#e53935"/><path d="M13 12C11 12 9 14 9 18C9 22 11 24 13 24C14 24 15 22 15 18C15 14 14 12 13 12Z" fill="#212121"/><path d="M23 12C21 12 22 14 22 18C22 22 21 24 23 24C25 24 27 22 27 18C27 14 25 12 23 12Z" fill="#212121"/><circle cx="12.5" cy="18" r="1.5" fill="white"/><circle cx="23.5" cy="18" r="1.5" fill="white"/></svg>`,

  // 7. Wolverine Style: Yellow background, Iconic black mask
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#fdd835"/><path d="M9 10L12 24L18 28L24 24L27 10L24 16L18 20L12 16L9 10Z" fill="#212121"/><path d="M13 22L16 23M23 22L20 23" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // 8. Thor Style: Silver/Red theme, Winged Helmet
  `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#37474f"/><circle cx="18" cy="18" r="15" fill="#b0bec5"/><path d="M18 8V28M8 18H28" stroke="#37474f" stroke-width="1" opacity="0.2"/><path d="M6 8L12 16M30 8L24 16" stroke="#eceff1" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="18" r="2" fill="#4fc3f7"/><circle cx="24" cy="18" r="2" fill="#4fc3f7"/></svg>`,

  // 9. Doctor Strange Style: Blue tunic, Red Cloak, Eye of Agamotto
  // `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#0d47a1"/><path d="M8 24C8 24 12 14 18 14C24 14 28 24 28 24" fill="#b71c1c"/><circle cx="18" cy="19" r="4" fill="#ffd740"/><path d="M18 17L19 19L18 21L17 19L18 17Z" fill="#69f0ae"/></svg>`,

  // 10. Groot Style: Wood brown, Green leaf
  // `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="18" cy="18" r="18" fill="#5d4037"/><path d="M18 8V14M18 22V32" stroke="#3e2723" stroke-width="2" stroke-linecap="round"/><circle cx="14" cy="18" r="2" fill="#1b1b1b"/><circle cx="22" cy="18" r="2" fill="#1b1b1b"/><path d="M18 8L22 4L24 7" fill="#66bb6a"/></svg>`
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    color: "",
    textcolor: "",
    description: "",
    notification_id: "",
    notification_type: "discord",
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
        setFormData({
          id: u.id,
          name: u.name || "",
          image: u.image || "",
          color: u.color || "",
          textcolor: u.textcolor || "",
          description: u.description || "",
          notification_id: u.notification_id || "",
          notification_type: u.notification_type || "discord",
        });
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

  const updateUser = async (data) => {
    //const token = localStorage.getItem("auth_token");
    const response = await edituser(data.id, data);
    // const response = await fetch("/api/user", {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${token}`,
    //   },
    //   body: JSON.stringify(data),
    // });
    console.log("response",response.success)

    if (response.success != true) {
      throw new Error("Failed to update profile");
    }

    return await response.data;
  };

  const handleTestNotification = async () => {
    if (!formData.notification_id) {
      Swal.fire("แจ้งเตือน", "กรุณากรอก Webhook URL ก่อนทำการทดสอบ", "warning");
      return;
    }

    try {
      const isDiscord = formData.notification_type === "discord";
      const body = isDiscord
        ? { content: "🔔 **Test Notification**\nนี่คือข้อความทดสอบจากระบบ Calenda Schedule" }
        : {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "0076D7",
            "summary": "Test Notification",
            "sections": [{
                "activityTitle": "🔔 Test Notification",
                "activitySubtitle": "Calenda Schedule",
                "text": "นี่คือข้อความทดสอบจากระบบ Calenda Schedule"
            }]
          };

      const res = await fetch(formData.notification_id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Swal.fire("สำเร็จ", "ส่งข้อความทดสอบเรียบร้อยแล้ว", "success");
      } else {
        Swal.fire("ล้มเหลว", `ไม่สามารถส่งข้อความได้ (Status: ${res.status})`, "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("เกิดข้อผิดพลาด", "ตรวจสอบ URL หรือ CORS Policy", "error");
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    try {
      await updateUser(formData);

      const newUser = {
        ...user,
        ...formData,
      };
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
    } catch (error) {
      console.log('error',error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
      });
    }
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
                  className="w-24 h-24 rounded-full border-4 border-purple-100 shadow-lg overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: user.color || "#f3f4f6" }}
                  dangerouslySetInnerHTML={{ __html: user.image }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-200 to-indigo-200 flex items-center justify-center text-purple-700 text-4xl font-bold shadow-lg border-4 border-white"
                  style={user.color ? { background: user.color } : {}}>
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>

            <div className="flex-1 w-full text-center md:text-left">
              {!isEditing ? (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2" style={{ color: user.textcolor }}>
                    {user.name}
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-purple-600 transition">
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                  </h2>
                  <p className="text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-1">@{user.username || "username"}</p>
                  {user.notification_id && <p className="text-xs text-gray-500 mt-1">{user.notification_type === 'msteams' ? 'MS Teams' : 'Discord'}: {user.notification_id}</p>}
                  {user.description && <p className="text-gray-600 mt-4 whitespace-pre-wrap">{user.description}</p>}
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">ชื่อ</label>
                    <input
                      type="text"
                      className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-purple-300"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">เลือกรูปโปรไฟล์</label>
                    <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
                      {MARVEL_AVATARS.map((svg, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setFormData({ ...formData, image: svg })}
                          className={`w-12 h-12 rounded-full border-2 overflow-hidden shrink-0 transition ${formData.image === svg ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-400'}`}
                          dangerouslySetInnerHTML={{ __html: svg }}
                        />
                      ))}
                    </div>
                    <label className="text-sm font-semibold text-gray-600">หรือใส่ SVG Code เอง</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-purple-300 text-xs font-mono"
                      rows="3"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-semibold text-gray-600">สีธีม</label>
                      <input
                        type="color"
                        className="w-full h-10 border rounded-lg cursor-pointer"
                        value={formData.color || "#ffffff"}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-semibold text-gray-600">สีข้อความ</label>
                      <input
                        type="color"
                        className="w-full h-10 border rounded-lg cursor-pointer"
                        value={formData.textcolor || "#000000"}
                        onChange={(e) => setFormData({ ...formData, textcolor: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">คำอธิบาย</label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-purple-300"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">ช่องทางการแจ้งเตือน</label>
                    <div className="flex gap-4 mt-1 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="notification_type"
                          value="discord"
                          checked={formData.notification_type === "discord"}
                          onChange={(e) => setFormData({ ...formData, notification_type: e.target.value })}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Discord</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="notification_type"
                          value="msteams"
                          checked={formData.notification_type === "msteams"}
                          onChange={(e) => setFormData({ ...formData, notification_type: e.target.value })}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">MS Teams</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 focus:ring focus:ring-purple-300"
                        value={formData.notification_id}
                        onChange={(e) => setFormData({ ...formData, notification_id: e.target.value })}
                        placeholder={formData.notification_type === 'discord' ? 'Discord Webhook URL' : 'MS Teams Webhook URL'}
                      />
                      <button
                        type="button"
                        onClick={handleTestNotification}
                        className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 flex items-center gap-2 transition"
                        title="ทดสอบส่งข้อความ"
                      >
                        <PaperAirplaneIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">ทดสอบ</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg hover:bg-gray-400 flex items-center gap-2">
                      <XMarkIcon className="w-5 h-5" /> ยกเลิก
                    </button>
                    <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2">
                      <CheckIcon className="w-5 h-5" /> บันทึก
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
