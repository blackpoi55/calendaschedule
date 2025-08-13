"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { addrole, deleterole, editrole } from "@/action/api";
import Swal from "sweetalert2";

function AddRoleModal({ data = [], onClose, refresh }) {
  const [form, setForm] = useState({
    id: null,
    name: "",
    color: "#000000",
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
    setForm({ id: null, name: "", color: "#000000", showindropdown: true });
    nameRef.current?.focus();
  }, []);

  const saveClick = async () => {
    if (!form.name.trim()) {
      return Swal.fire("กรอกไม่ครบ", "กรุณาระบุชื่อ Role", "warning");
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color || "#000000",
        showindropdown: !!form.showindropdown,
      };

      if (form.id == null) {
        await addrole(payload);
        Swal.fire({
          title: "สำเร็จ",
          text: "เพิ่ม Role ใหม่แล้ว",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await editrole(form.id, payload);
        Swal.fire({
          title: "สำเร็จ",
          text: "แก้ไข Role แล้ว",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      refresh?.();
      // ถ้าต้องการปิด modal หลังบันทึก ให้ใช้ onClose?.() แทน resetForm()
      resetForm();
    } catch (error) {
      console.error("Error saving role:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteClick = async (role) => {
    if (loading) return; // กันกดซ้ำระหว่างกำลังทำงาน
    const result = await Swal.fire({
      title: "ลบ Role นี้?",
      text: `คุณต้องการลบ Role "${role.name}" หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const res = await deleterole(role.id);
      if (!res?.error) {
        Swal.fire({
          title: "สำเร็จ",
          text: "ลบ Role แล้ว",
          icon: "success",
          timer: 1200,
          showConfirmButton: false,
        });
        refresh?.();
        if (form.id === role.id) resetForm();
      } else {
        Swal.fire("ไม่สำเร็จ", "ไม่สามารถลบ Role ได้", "error");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถลบ Role ได้", "error");
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
        className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} // กัน event bubble ออกจากกล่อง
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-100 to-purple-100">
          <h3 className="text-lg font-semibold">จัดการตำแหน่ง (Role)</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-white bg-red-500 hover:bg-red-400"
          >
            x
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* ฟอร์มเพิ่ม/แก้ไข */}
          <form
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) saveClick();
            }}
          >
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                ref={nameRef}
                className="w-full border rounded-lg p-2"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="เช่น Frontend, Backend"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <input
                type="color"
                className="h-10 w-10  rounded-full"
                value={form.color || "#000000"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, color: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-2 md:col-span-1">
              <input
                id="role-show"
                type="checkbox"
                checked={!!form.showindropdown}
                onChange={(e) =>
                  setForm((f) => ({ ...f, showindropdown: e.target.checked }))
                }
              />
              <label htmlFor="role-show" className="text-sm">
                Show
              </label>
            </div>

            <div className="flex gap-2 md:justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg"
              >
                {loading
                  ? "กำลังบันทึก..."
                  : form.id == null
                  ? "เพิ่ม"
                  : "บันทึกการแก้ไข"}
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
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Color</th>
                  <th className="p-3 text-left">Show</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((r, idx) => (
                  <tr key={r?.id ?? idx} className="odd:bg-white even:bg-gray-50">
                    <td className="p-3">{r?.id}</td>
                    <td className="p-3 font-medium">{r?.name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full border"
                          style={{ background: r?.color || "#000000" }}
                        />
                        <span className="text-sm">{r?.color}</span>
                      </div>
                    </td>
                    <td className="p-3">{r?.showindropdown ? "✓" : "-"}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setForm({
                            id: r?.id ?? null,
                            name: r?.name ?? "",
                            color: r?.color ?? "#000000",
                            showindropdown: !!r?.showindropdown,
                          })}
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
                ))}
                {(data ?? []).length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-4 text-center text-gray-500"
                    >
                      ยังไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddRoleModal;
