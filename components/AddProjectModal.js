// import { useState, useEffect } from "react";
// import dayjs from "dayjs";
// import Swal from "sweetalert2"; 

// export default function AddProjectModal({ onClose, onSave, editData }) {
//     const today = dayjs();
//     const [formData, setFormData] = useState({
//         name: "", 
//         startDate: today.format("YYYY-MM-DD"),
//         endDate: today.add(7, "day").format("YYYY-MM-DD"),
//         totalDays: 8, // ✅ เพิ่มช่องวัน
//     }); 

//     useEffect(() => {
//         if (editData) {
//             const start = dayjs(editData.startDate);
//             const end = dayjs(editData.endDate);
//             setFormData({
//                 name: editData.name || "", 
//                 startDate: start.format("YYYY-MM-DD"),
//                 endDate: end.format("YYYY-MM-DD"),
//                 totalDays: end.diff(start, "day") + 1,
//             });
//         } else {
//             setFormData((prev) => ({
//                 ...prev,
//                 totalDays: dayjs(prev.endDate).diff(dayjs(prev.startDate), "day") + 1,
//             }));
//         }
//     }, [editData]);

//     // ✅ handleChange พร้อม auto-calc
//     const handleChange = (field, value) => {
//         setFormData((prev) => {
//             let updated = { ...prev, [field]: value };
//             const start = dayjs(updated.startDate);
//             const end = dayjs(updated.endDate);

//             if (field === "startDate" || field === "endDate") {
//                 if (end.isBefore(start)) {
//                     Swal.fire("ผิดพลาด", "วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น!", "error");
//                     updated.endDate = start.format("YYYY-MM-DD");
//                 }
//                 updated.totalDays = dayjs(updated.endDate).diff(dayjs(updated.startDate), "day") + 1;
//             }

//             if (field === "totalDays" && value > 0) {
//                 updated.endDate = start.add(parseInt(value) - 1, "day").format("YYYY-MM-DD");
//             }

//             return updated;
//         });
//     };

//     // ✅ Save
//     const handleSave = () => {
//         const { name, startDate, endDate, totalDays } = formData;

//         if (!name || !startDate || !endDate) {
//             Swal.fire("ผิดพลาด", "กรุณากรอกข้อมูลให้ครบทุกช่อง!", "error");
//             return;
//         }

//         if (totalDays <= 0) {
//             Swal.fire("ผิดพลาด", "จำนวนวันต้องมากกว่า 0!", "error");
//             return;
//         }

//         const project = {
//             id: editData ? editData.id : "",
//             name, 
//             startDate,
//             endDate,
//             totalDays,
//             details: editData ? editData.details : [],
//         };

//         onSave(project); 
//     };


//     return (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//             <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
//                 <h2 className="text-2xl font-bold text-purple-600 mb-4">
//                     {editData ? "✏️ แก้ไขโปรเจค" : "➕ เพิ่มโปรเจคใหม่"}
//                 </h2>
//                 <div className="space-y-3">
//                     {/* ชื่อโปรเจค */}
//                     <input
//                         type="text"
//                         placeholder="ชื่อโปรเจค"
//                         className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
//                         value={formData.name}
//                         onChange={(e) => handleChange("name", e.target.value)}
//                     />


//                     {/* ✅ จำนวนวัน */}
//                     <input
//                         type="number"
//                         className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
//                         placeholder="จำนวนวัน (auto)"
//                         value={formData.totalDays||0}
//                         onChange={(e) => handleChange("totalDays", e.target.value)}
//                     />
//                     {/* ✅ วันที่ + จำนวนวัน */}
//                     <div className="flex gap-3">
//                         <input
//                             type="date"
//                             className="flex-1 p-3 border rounded-lg focus:ring focus:ring-purple-300"
//                             value={formData.startDate}
//                             onChange={(e) => handleChange("startDate", e.target.value)}
//                         />
//                         <input
//                             type="date"
//                             className="flex-1 p-3 border rounded-lg focus:ring focus:ring-purple-300"
//                             value={formData.endDate}
//                             onChange={(e) => handleChange("endDate", e.target.value)}
//                         />
//                     </div>


//                 </div>

//                 {/* ปุ่ม */}
//                 <div className="flex justify-end gap-2 mt-6">
//                     <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
//                         ยกเลิก
//                     </button>
//                     <button
//                         onClick={handleSave}
//                         className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:scale-105 transition"
//                     >
//                         {editData ? "บันทึกการแก้ไข" : "บันทึก"}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }

import { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { getmemberbyteam } from "@/action/api";

export default function AddProjectModal({ onClose, onSave, editData }) {
  const today = dayjs();

  // ====== Project form ======
  const [formData, setFormData] = useState({
    name: "",
    startDate: today.format("YYYY-MM-DD"),
    endDate: today.add(7, "day").format("YYYY-MM-DD"),
    totalDays: 8,
  });

  // ====== Members (from API) ======
  const [members, setMembers] = useState([]); // [{id,name,email,image,color,textcolor,...}]
  const [selectedIds, setSelectedIds] = useState(new Set()); // store member ids
  const [search, setSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ---- fetch members ----
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        // const token =
        //   localStorage.getItem("token") ||
        //   localStorage.getItem("accessToken") || "";
        const t = localStorage.getItem('auth_user')
        const auth_user = JSON.parse(t)
        const res = await getmemberbyteam(auth_user.id)

        // รองรับหลายรูปแบบ payload ที่พบบ่อย
        // เช่น { data: [...] } หรือ [...] ตรง ๆ
        const items = Array.isArray(res) ? res : res?.data.members ?? [];

        // map ให้มีโครงที่ใช้ใน UI ได้แน่
        const normalized = items?.map((it) => ({
          id: it.id ?? it.userId ?? it.memberId ?? it.uid ?? String(Math.random()),
          name: it.user.name ?? "Unknown",
          email: it.user.email ?? it.mail ?? "",
          image: it.image ?? it.avatar ?? it.photoURL ?? "",
          color: it.color ?? "#000000",
          textcolor: it.textcolor ?? "#ffffff",
          raw: it, // เก็บดิบเผื่อใช้ต่อ
        }));

        setMembers(normalized);

        // ถ้ามี editData.members ให้ติ๊กไว้
        if (editData?.members?.length) {
          const preset = new Set(
            editData.members
              .map((m) => m.id ?? m.userId ?? m.memberId)
              .filter(Boolean)
          );
          setSelectedIds(preset);
        }
      } catch (err) {
        console.error(err);
        Swal.fire("ดึงรายชื่อสมาชิกไม่สำเร็จ", String(err?.message ?? err), "error");
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [editData]);

  // ---- init / sync form when editData ----
  useEffect(() => {
    if (editData) {
      const start = dayjs(editData.startDate);
      const end = dayjs(editData.endDate);
      setFormData({
        name: editData.name || "",
        startDate: start.format("YYYY-MM-DD"),
        endDate: end.format("YYYY-MM-DD"),
        totalDays: end.diff(start, "day") + 1,
      });

      // ถ้า editData มี members แต่มา “ก่อน” ที่ members จาก API
      // จะ preset ชั่วคราวด้วย, แล้วตอน API มาอีกทีด้านบนจะ sync ให้
      if (editData.members?.length) {
        const preset = new Set(
          editData.members
            .map((m) => m.id ?? m.userId ?? m.memberId)
            .filter(Boolean)
        );
        setSelectedIds(preset);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        totalDays: dayjs(prev.endDate).diff(dayjs(prev.startDate), "day") + 1,
      }));
    }
  }, [editData]);

  // ---- filter for search ----
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    );
  }, [members, search]);

  // ====== handlers ======
  const handleChange = (field, value) => {
    setFormData((prev) => {
      let updated = { ...prev, [field]: value };
      const start = dayjs(updated.startDate);
      const end = dayjs(updated.endDate);

      if (field === "startDate" || field === "endDate") {
        if (end.isBefore(start)) {
          Swal.fire("ผิดพลาด", "วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น!", "error");
          updated.endDate = start.format("YYYY-MM-DD");
        }
        updated.totalDays =
          dayjs(updated.endDate).diff(dayjs(updated.startDate), "day") + 1;
      }

      if (field === "totalDays") {
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n > 0) {
          updated.endDate = start.add(n - 1, "day").format("YYYY-MM-DD");
          updated.totalDays = n;
        }
      }

      return updated;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredMembers.forEach((m) => next.add(m.id));
      return next;
    });
  };

  const clearAll = () => setSelectedIds(new Set());

  const handleSave = () => {
    const { name, startDate, endDate, totalDays } = formData;

    if (!name || !startDate || !endDate) {
      Swal.fire("ผิดพลาด", "กรุณากรอกข้อมูลให้ครบทุกช่อง!", "error");
      return;
    }

    if (totalDays <= 0) {
      Swal.fire("ผิดพลาด", "จำนวนวันต้องมากกว่า 0!", "error");
      return;
    }

    // สร้าง members payload ที่สะอาด (เก็บฟิลด์ที่จำเป็น)
    const selectedMembers = members
      .filter((m) => selectedIds.has(m.id))
      .map((m) => ({
      //  id: m.id,
        name: m.name,
        email: m.email,
        image: m.image,
        color: m.color,
        textcolor: m.textcolor,
        roleInTeam: m.raw?.roleInTeam || "member",
        userId: m.raw?.userId || m.raw?.id || null,
      }));

    const project = {
      id: editData ? editData.id : "",
      name,
      startDate,
      endDate,
      totalDays,
      OwnerId: editData ? editData.ownerId : (localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user')).id : null),
      // เก็บ details เดิม (ถ้ามี) และเพิ่ม members ชัดเจน
      details: editData ? editData.details ?? [] : [],
      members: selectedMembers,
    };

    onSave(project);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-purple-600 mb-4">
          {editData ? "✏️ แก้ไขโปรเจค" : "➕ เพิ่มโปรเจคใหม่"}
        </h2>

        <div className="space-y-4">
          {/* ชื่อโปรเจค */}
          <input
            type="text"
            placeholder="ชื่อโปรเจค"
            className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          {/* วันที่ + จำนวนวัน */}
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="date"
              className="flex-1 p-3 border rounded-lg focus:ring focus:ring-purple-300"
              value={formData.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
            />
            <input
              type="date"
              className="flex-1 p-3 border rounded-lg focus:ring focus:ring-purple-300"
              value={formData.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
            />
            <input
              type="number"
              className="w-full md:w-40 p-3 border rounded-lg focus:ring focus:ring-purple-300"
              placeholder="จำนวนวัน"
              min={1}
              value={formData.totalDays || 0}
              onChange={(e) => handleChange("totalDays", e.target.value)}
            />
          </div>

          {/* Member Selector */}
          <div className="border rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="font-semibold text-purple-600">👥 สมาชิกในทีม</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 rounded-lg"
                >
                  เลือกทั้งหมด (ที่กรอง)
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  ล้างที่เลือก
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="ค้นหาชื่อหรืออีเมล..."
                className="w-full p-2.5 border rounded-lg focus:ring focus:ring-purple-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {loadingMembers && (
                <span className="text-sm text-gray-500">กำลังโหลด...</span>
              )}
            </div>

            <div className="max-h-64 overflow-auto rounded-lg border">
              {filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {loadingMembers ? "กำลังดึงข้อมูลสมาชิก..." : "ไม่พบสมาชิก"}
                </div>
              ) : (
                <ul className="divide-y">
                  {filteredMembers.map((m) => {
                    const checked = selectedIds.has(m.id);
                    return (
                      <li
                        key={m.id}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-50 ${checked ? "bg-purple-50" : ""
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={() => toggleSelect(m.id)}
                        />
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: m.color || "#e5e7eb",
                            color: m.textcolor || "#111827",
                          }}
                          title={m.name}
                        >
                          {m.image ? (
                            // ถ้ามีรูปจริงๆ สามารถเปลี่ยนเป็น <img .../> ได้
                            m.name?.charAt(0)?.toUpperCase() ?? "U"
                          ) : (
                            m.name?.charAt(0)?.toUpperCase() ?? "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="text-sm text-gray-500 truncate">
                            {m.email || "-"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              เลือกแล้ว {selectedIds.size} คน
            </p>
          </div>
        </div>

        {/* ปุ่ม */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:scale-105 transition"
          >
            {editData ? "บันทึกการแก้ไข" : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

