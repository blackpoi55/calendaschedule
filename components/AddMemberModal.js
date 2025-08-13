"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { addmember, deletemember, editmember } from "@/action/api";
import Swal from "sweetalert2";

function AddMemberModal({ data = [], onClose, refresh }) {
  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    image: "",
    color: "#000000",
    textcolor: "#ffffff",
    description: "",
    showindropdown: true,
  });
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);

  // โฟกัสช่อง Name เมื่อเปิด modal
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // ปิดด้วยปุ่ม Esc
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const resetForm = useCallback(() => {
    setForm({
      id: null,
      name: "",
      email: "",
      image: "",
      color: "#000000",
      textcolor: "#ffffff",
      description: "",
      showindropdown: true,
    });
    nameRef.current?.focus();
  }, []);

  const validateSvg = (svg) => {
    const s = (svg || "").trim().toLowerCase();
    if (!s) return true;             // ว่างได้
    if (!s.startsWith("<svg")) return false;
    if (s.includes("<script")) return false;
    return true;
  };

  const saveClick = async () => {
    if (!form.name.trim()) {
      return Swal.fire("กรอกไม่ครบ", "กรุณาระบุชื่อ Member", "warning");
    }
    if (!validateSvg(form.image)) {
      return Swal.fire("SVG ไม่ถูกต้อง", "กรุณาวางเฉพาะโค้ด <svg>…</svg> และห้ามมี <script>", "warning");
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: (form.email || "").trim(),
        image: form.image || "",
        color: form.color || "#000000",
        textcolor: form.textcolor || "#ffffff",
        description: form.description || "",
        showindropdown: !!form.showindropdown,
      };

      if (form.id == null) {
        await addmember(payload);
        Swal.fire({ title: "สำเร็จ", text: "เพิ่ม Member ใหม่แล้ว", icon: "success", timer: 1500, showConfirmButton: false });
      } else {
        await editmember(form.id, payload);
        Swal.fire({ title: "สำเร็จ", text: "แก้ไข Member แล้ว", icon: "success", timer: 1500, showConfirmButton: false });
      }
      refresh?.();
      // ถ้าต้องการปิด modal ทันที: onClose?.();
      resetForm();
    } catch (error) {
      console.error("Error saving member:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteClick = async (member) => {
    if (loading) return; // กันกดลบซ้ำระหว่างทำงาน
    const result = await Swal.fire({
      title: "ลบ Member นี้?",
      text: `คุณต้องการลบ Member "${member.name}" หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const res = await deletemember(member.id);
      if (!res?.error) {
        Swal.fire({ title: "สำเร็จ", text: "ลบ Member แล้ว", icon: "success", timer: 1200, showConfirmButton: false });
        refresh?.();
        if (form.id === member.id) resetForm();
      } else {
        Swal.fire("ไม่สำเร็จ", "ไม่สามารถลบ Member ได้", "error");
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถลบ Member ได้", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // ปิดเมื่อคลิกที่ backdrop
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="bg-white w-full max-w-6xl rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} // กัน event bubble ออกจากกล่อง
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-100 to-purple-100">
          <h3 className="text-lg font-semibold">จัดการสมาชิก (Member)</h3>
          <button onClick={onClose}  className="px-3 py-1 rounded-lg text-white bg-red-500 hover:bg-red-400"
          >
            x</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* ฟอร์มเพิ่ม/แก้ไข */}
          <form
            className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end"
            onSubmit={(e) => { e.preventDefault(); if (!loading) saveClick(); }}
          >
            {/* ID: แสดงตอนแก้ไข */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">ID</label>
              <input
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-600"
                value={form.id ?? ""}
                disabled
                placeholder="-"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                ref={nameRef}
                className="w-full border rounded-lg p-2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="เช่น สมชาย, John Dev"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                className="w-full border rounded-lg p-2"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">Color</label>
              <input
                type="color"
                className="h-10 w-10  rounded-full"
                value={form.color || "#000000"}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">Text Color</label>
              <input
                type="color"
                className="h-10 w-10  rounded-full"
                value={form.textcolor || "#ffffff"}
                onChange={(e) => setForm((f) => ({ ...f, textcolor: e.target.value }))}
              />
            </div>

            <div className="md:col-span-1 flex items-center gap-2">
              <input
                id="member-show"
                type="checkbox"
                checked={form.showindropdown}
                onChange={(e) => setForm((f) => ({ ...f, showindropdown: e.target.checked }))}
              />
              <label htmlFor="member-show" className="text-sm">Show</label>
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1">
                SVG (image) <span className="text-xs text-gray-500">— วางโค้ด &lt;svg ...&gt;...&lt;/svg&gt;</span>
              </label>
              <textarea
                className="w-full border rounded-lg p-2 h-28"
                placeholder="<svg>...</svg>"
                value={form.image}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full border rounded-lg p-2 h-28"
                placeholder="รายละเอียดเพิ่มเติมของสมาชิก"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="md:col-span-8 flex gap-2 md:justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg"
              >
                {loading ? "กำลังบันทึก..." : form.id == null ? "เพิ่ม" : "บันทึกการแก้ไข"}
              </button>
              {form.id != null && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                >
                  ยกเลิกแก้ไข
                </button>
              )}
            </div>
          </form>

          {/* ตารางรายการ */}
          <div className="overflow-auto border rounded-xl max-h-[60vh]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Avatar</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Color</th>
                  <th className="p-3 text-left">Text</th>
                  <th className="p-3 text-left">Show</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((r, idx) => {
                  const color = r?.color ?? "#000000";
                  const textcolor = r?.textcolor ?? "#ffffff";
                  const show = (r?.showindropdown ?? true) === true;
                  return (
                    <tr key={r?.id ?? idx} className="odd:bg-white even:bg-gray-50">
                      <td className="p-3">{r?.id}</td>
                      <td className="p-3">
                        {r?.image ? (
                          <div
                            className="w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: r.image }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border flex items-center justify-center text-xs text-gray-500">N/A</div>
                        )}
                      </td>
                      <td className="p-3 font-medium">{r?.name}</td>
                      <td className="p-3">{r?.email}</td>
                      <td className="p-3">
                        <div className="max-w-[260px] truncate">{r?.description || "-"}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full border" style={{ background: color }} />
                          <span className="text-sm">{color}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full border" style={{ background: textcolor }} />
                          <span className="text-sm">{textcolor}</span>
                        </div>
                      </td>
                      <td className="p-3">{show ? "✓" : "-"}</td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() =>
                              setForm({
                                id: r?.id ?? null,
                                name: r?.name ?? "",
                                email: r?.email ?? "",
                                image: r?.image ?? "",
                                color,
                                textcolor,
                                description: r?.description ?? "",
                                showindropdown: show,
                              })
                            }
                            className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg disabled:opacity-60"
                            disabled={loading}
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => deleteClick(r)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-60"
                            disabled={loading}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-500">ยังไม่มีรายการ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-end">
            <button onClick={onClose} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">ปิด</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddMemberModal;
