"use client";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { getrole, getmember, getproJectsById } from "@/action/api";

export default function AddTaskModal({ id, onClose, onSave, editData, preFillDates }) {
  const today = dayjs();
  console.log("id", id);
  const [data, setData] = useState({
    id: undefined,
    name: "",
    roleId: 0,         // ✅ เก็บ role เป็น id
    roleLabel: "",      // ใช้โชว์/ค้นหา
    description: "",
    days: "4",
    start: today.format("YYYY-MM-DD"),
    end: today.add(3, "day").format("YYYY-MM-DD"),
    member: [],         // เก็บ id (string) ของสมาชิกใน state
    remark: "",
    project_id: id, // เผื่อแก้ไข จะติดมาใน editData
  });

  const [roleMap, setRoleMap] = useState([]);
  const [memberMap, setMemberMap] = useState([]);
  const [loadingMaps, setLoadingMaps] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rolesRes, projectRes] = await Promise.all([getrole(), getproJectsById(id)]);
        setRoleMap(rolesRes?.data || []);
        // setMemberMap(membersRes?.data.ProjectMembers || []);
        // note: API คืน data เป็นอาเรย์ของโปรเจกต์
        const proj = Array.isArray(projectRes?.data) ? projectRes.data[0] : projectRes?.data;
        const rawMembers = proj?.ProjectMembers || [];

        const mappedMembers = rawMembers.map((pm) => {
          const u = pm?.user || {};
          const uid = String(u.id ?? pm.userId ?? "");
          const display = u.name || u.email || `User ${uid}`;
          const bg = pickColorFromId(uid);
          return {
            // รูปแบบที่โค้ดด้านล่างของคุณใช้อยู่
            id: uid,                     // ✅ ให้ id เป็นสตริง
            name: display,               // ✅ labelOf() จะหยิบจาก name/label
            label: display,
            email: u.email || "",
            roleInProject: pm.roleInProject || "member",
            color: bg,                   // ✅ ใช้เป็นพื้นหลังเมื่อ selected
            textcolor: "#ffffff",
            image: svgInitialAvatar(display, bg, "#ffffff"), // ✅ แทรกเป็น inline SVG
          };
        });

        setMemberMap(mappedMembers);
      } catch (e) {
        console.error(e);
        Swal.fire("ผิดพลาด", "โหลดข้อมูล Role/Member ไม่สำเร็จ", "error");
      } finally {
        setLoadingMaps(false);
      }
    })();
  }, [id]);

  // utils
  const toStr = (v) => (v ?? "").toString();
  const norm = (v) => toStr(v).trim().toLowerCase();
  const labelOf = (x) => x?.label ?? x?.name ?? x?.value ?? x?.id ?? "";
  const idOf = (x) => x?.id ?? x?.value ?? x?.code ?? x?.key ?? x?.label ?? x?.name;
  const asIdStr = (v) => toStr(v);

  // normalize member input (array -> id strings)
  const normalizeMemberInput = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => {
        if (x && typeof x === "object") {
          const id = idOf(x);
          return id != null ? asIdStr(id) : null;
        }
        // string/number
        const found = memberMap.find((m) => norm(labelOf(m)) === norm(x) || toStr(idOf(m)) === toStr(x));
        return found ? asIdStr(idOf(found)) : (x != null ? asIdStr(x) : null);
      })
      .filter(Boolean);
  };

  // load initial values
  useEffect(() => {
    if (editData) {
      console.log("editData:", editData);
      const start = editData.start || today.format("YYYY-MM-DD");
      const end = editData.end || today.format("YYYY-MM-DD");
      const calcDays = dayjs(end).diff(dayjs(start), "day") + 1;

      setData((prev) => ({
        ...prev,
        id: editData.id?parseInt(editData.id):undefined,
        project_id: editData.projectId,                   // ✅ รับมาจาก API
        name: editData.name || "",
        // role จะ map เป็น id/label หลังจาก roleMap มาแล้ว (อีก useEffect ด้านล่าง)
        days: toStr(editData.days ?? Math.max(calcDays, 1)),
        start,
        end,
        member: Array.isArray(editData.members) ? editData.members : [],
        remark: editData.remark || "",
        description: editData.description || "",
      }));
    } else if (preFillDates) {
      const s = dayjs(preFillDates.start);
      const e = dayjs(preFillDates.end);
      setData((prev) => ({
        ...prev,
        start: s.format("YYYY-MM-DD"),
        end: e.format("YYYY-MM-DD"),
        days: e.diff(s, "day") + 1 + "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editData, preFillDates]);

  // หลัง roleMap/memberMap โหลดแล้ว ค่อย map role, member
  useEffect(() => {
    if (loadingMaps) return;

    setData((prev) => {
      let roleId = prev.roleId;
      let roleLabel = prev.roleLabel;

      // map role จาก editData.role (อาจเป็น id หรือ label)
      if (!roleId && editData?.role != null && roleMap.length) {
        const asStr = toStr(editData.role);
        // หาโดย id ก่อน
        let found = roleMap.find((r) => toStr(idOf(r)) === asStr);
        if (!found) {
          // หาโดย label/name
          found = roleMap.find((r) => norm(labelOf(r)) === norm(asStr));
        }
        if (found) {
          roleId = asIdStr(idOf(found));
          roleLabel = labelOf(found);
        }
      }

      return {
        ...prev,
        roleId,
        roleLabel,
        member: normalizeMemberInput(prev.member),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMaps]);

  const [roleFilter, setRoleFilter] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const handleChange = (field, value) => {
    setData((prev) => {
      let updated = { ...prev, [field]: value };
      const startDate = dayjs(updated.start);
      const endDate = dayjs(updated.end);

      // sync start/end -> days
      if ((field === "start" || field === "end") && updated.start && updated.end) {
        if (endDate.isBefore(startDate, "day")) {
          Swal.fire("ผิดพลาด", "วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น!", "error");
          updated.end = startDate.format("YYYY-MM-DD");
          updated.days = "1";
        } else {
          updated.days = endDate.diff(startDate, "day") + 1 + "";
        }
      }

      // sync days -> end
      if (field === "days" && updated.start && value) {
        const d = Math.max(parseInt(value || "1", 10), 1);
        updated.days = d.toString();
        updated.end = startDate.add(d - 1, "day").format("YYYY-MM-DD");
      }

      return updated;
    });
  };

  const handleSave = () => {
    const { id, project_id, name, roleId, days, start, end, member, remark, description } = data;
    console.log(data)
    if (!name.trim() || !start || !end) {
      Swal.fire("ผิดพลาด", "กรอก 'ชื่องาน', 'วันที่เริ่ม', 'วันที่สิ้นสุด' ให้ครบ!", "error");
      return;
    }

    const startDate = dayjs(start);
    const endDate = dayjs(end);
    if (!startDate.isValid() || !endDate.isValid() || endDate.isBefore(startDate, "day")) {
      Swal.fire("ผิดพลาด", "ช่วงวันที่ไม่ถูกต้อง!", "error");
      return;
    }
    const calcDays = endDate.diff(startDate, "day") + 1;

    // map member -> [{id,name}]
    const memberPayload = (member || []).map((idStr) => {
      const found = memberMap.find((m) => toStr(idOf(m)) === toStr(idStr));
      const nm = labelOf(found) || "";
      const numId = Number(idStr);
      return { id: Number.isNaN(numId) ? idStr : numId, name: nm };
    });

    onSave({
      ...(id ? { id } : {}),
      ...(project_id ? { project_id: parseInt(project_id) } : {}),   // ✅ แนบ project_id มาให้ด้วยถ้ามี (สำคัญตอน edit)
      name: name,
      role: roleId ? (Number.isNaN(Number(roleId)) ? roleId : Number(roleId)) : 0, // ✅ ส่ง role เป็น id
      description,
      days: calcDays,
      start: startDate.format("YYYY-MM-DD"),
      end: endDate.format("YYYY-MM-DD"),
      member: memberPayload,                   // ✅ [{id,name}]
      remark,
    });
  };

  const filteredRoles = roleMap.filter((r) => norm(labelOf(r)).includes(norm(roleFilter)));

  const pickRole = (r) => {
    const id = asIdStr(idOf(r));
    const label = labelOf(r);
    setData((prev) => ({ ...prev, roleId: id, roleLabel: label }));
    setRoleFilter("");
    setShowDropdown(false);
  };

  const toggleMember = (idStr) => {
    setData((prev) => {
      const exists = prev.member.includes(idStr);
      return {
        ...prev,
        member: exists ? prev.member.filter((x) => x !== idStr) : [...prev.member, idStr],
      };
    });
  };
  // ===== helper: ทำสีจาก id แบบ deterministic =====
  function pickColorFromId(id) {
    const s = String(id);
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
    // H[0..359], S/V fixed เพื่อให้อ่านง่าย
    const h = Math.abs(hash) % 360;
    return `hsl(${h} 70% 35%)`; // สีพื้น
  }
  function svgInitialAvatar(text = "", bg = "#111827", fg = "#fff") {
    const t = (text || "").trim();
    const initials = t.length
      ? t
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase())
        .slice(0, 2)
        .join("")
      : "?";
    const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>
  <rect width='100%' height='100%' rx='4' ry='4' fill='${bg}' />
  <text x='50%' y='58%' text-anchor='middle' font-family='Inter,Arial' font-size='12' fill='${fg}'>${initials}</text>
</svg>`;
    return svg;
  }


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-purple-600 mb-4">
          {editData ? "✏ แก้ไขงาน" : "➕ เพิ่มงาน"}
        </h2>

        <div className="space-y-4">
          {/* ชื่อ Task */}
          <div>
            <p className="font-semibold mb-2">ชื่อ Task</p>
            <input
              type="text"
              placeholder="กรอกชื่อ Task"
              className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
              value={data.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          {/* ตำแหน่ง (role) */}
          <div className="relative">
            <p className="font-semibold mb-2">ตำแหน่ง (ถ้ามี)</p>
            <input
              type="text"
              placeholder="ค้นหาตำแหน่ง..."
              className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
              value={data.roleLabel}
              onChange={(e) => {
                // พิมพ์เอง -> เคลียร์ roleId เพื่อกันส่ง id ผิด
                setData((prev) => ({ ...prev, roleLabel: e.target.value, roleId: "" }));
                setRoleFilter(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && (
              <ul className="absolute w-full bg-white border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-md z-50">
                {loadingMaps ? (
                  <li className="px-4 py-2 text-gray-500">กำลังโหลด...</li>
                ) : filteredRoles.length > 0 ? (
                  filteredRoles.map((r, idx) => (
                    <li
                      key={idx}
                      onClick={() => pickRole(r)}
                      className="px-4 py-2 hover:bg-purple-100 cursor-pointer"
                    >
                      {labelOf(r)}
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-2 text-gray-500">ไม่พบตำแหน่ง</li>
                )}
              </ul>
            )}
            {data.roleId && (
              <p className="text-xs text-gray-500 mt-1">เลือกแล้ว: id = {data.roleId}</p>
            )}
          </div>

          {/* จำนวนวัน */}
          <input
            type="number"
            placeholder="จำนวนวัน"
            className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
            value={data.days}
            onChange={(e) => handleChange("days", e.target.value)}
            min={1}
          />

          {/* วันที่เริ่ม - สิ้นสุด */}
          <div className="flex gap-3">
            <input
              type="date"
              className="flex-1 p-3 border rounded-lg focus:ring focus:ring-purple-300"
              value={data.start}
              onChange={(e) => handleChange("start", e.target.value)}
            />
            <input
              type="date"
              className="flex-1 p-3 border rounded-lg focus:ring focus:ring-purple-300"
              value={data.end}
              onChange={(e) => handleChange("end", e.target.value)}
            />
          </div>

          {/* สมาชิก */}
          <div>
            <p className="font-semibold mb-2">สมาชิกในงาน</p>
            {loadingMaps ? (
              <div className="text-gray-500 text-sm">กำลังโหลดสมาชิก...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {memberMap.map((m, i) => {
                  const idStr = asIdStr(idOf(m));
                  const label = labelOf(m);
                  const selected = data.member.includes(idStr);
                  return (
                    <div
                      key={`${idStr}-${i}`}
                      onClick={() => toggleMember(idStr)}
                      style={{
                        backgroundColor: selected ? m.color || "#111827" : "#f3f4f6",
                        color: selected ? m.textcolor || "#fff" : "#333",
                      }}
                      className="flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer shadow hover:scale-105 transition"
                      title={label}
                    >
                      {m.image && (
                        <span
                          className="w-6 h-6 mb-1"
                          dangerouslySetInnerHTML={{ __html: m.image }}
                        />
                      )}
                      <span className="text-xs truncate">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* รายละเอียดงาน */}
          <div>
            <p className="font-semibold mb-2">รายละเอียดงาน (Description)</p>
            <textarea
              placeholder="อธิบายรายละเอียดของงาน..."
              className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300 resize-none"
              rows={3}
              value={data.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          {/* หมายเหตุ */}
          <div>
            <p className="font-semibold mb-2">หมายเหตุ (Remark)</p>
            <textarea
              placeholder="เพิ่มหมายเหตุ..."
              className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300 resize-none"
              rows={3}
              value={data.remark}
              onChange={(e) => handleChange("remark", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:scale-105 transition"
            disabled={loadingMaps}
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
