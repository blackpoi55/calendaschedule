"use client";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { roleOptions, memberOptions } from "@/lib/mockData";

export default function AddTaskModal({ onClose, onSave, editData, preFillDates }) {
    const today = dayjs();

    const [data, setData] = useState({
        role: "",
        days: "4",
        start: today.format("YYYY-MM-DD"),
        end: today.add(3, "day").format("YYYY-MM-DD"),
        member: [],
        remark: ""
    });

    useEffect(() => {
        if (editData) {
            // ✅ แก้ไข task เดิม
            setData({
                role: editData.role || "",
                days: editData.days?.toString() || "1",
                start: editData.start || today.format("YYYY-MM-DD"),
                end: editData.end || today.add(0, "day").format("YYYY-MM-DD"),
                member: editData.member || [],
                remark: editData.remark || ""
            });
        } else if (preFillDates) {
            // ✅ กรณีเพิ่มใหม่และมี prefill จาก calendar
            const start = dayjs(preFillDates.start);
            const end = dayjs(preFillDates.end);
            setData((prev) => ({
                ...prev,
                start: start.format("YYYY-MM-DD"),
                end: end.format("YYYY-MM-DD"),
                days: end.diff(start, "day") + 1 + ""
            }));
        }
    }, [editData, preFillDates]);

    const [roleFilter, setRoleFilter] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    const handleChange = (field, value) => {
        setData((prev) => {
            let updated = { ...prev, [field]: value };
            const startDate = dayjs(updated.start);
            const endDate = dayjs(updated.end);

            if ((field === "start" || field === "end") && updated.start && updated.end) {
                if (endDate.isBefore(startDate)) {
                    Swal.fire("ผิดพลาด", "วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มต้น!", "error");
                    updated.end = startDate.format("YYYY-MM-DD");
                } else {
                    updated.days = endDate.diff(startDate, "day") + 1 + "";
                }
            }

            if (field === "days" && updated.start && value) {
                const newEnd = startDate.add(parseInt(value) - 1, "day");
                updated.end = newEnd.format("YYYY-MM-DD");
            }

            return updated;
        });
    };

    const handleSave = () => {
        const { role, days, start, end, member, remark } = data;
        if (!role || !days || !start || !end) {
            Swal.fire("ผิดพลาด", "กรุณากรอกข้อมูลให้ครบ!", "error");
            return;
        }
        const startDate = dayjs(start);
        const endDate = dayjs(end);
        const calcDays = endDate.diff(startDate, "day") + 1;
        if (endDate.isBefore(startDate)) {
            Swal.fire("ผิดพลาด", "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น!", "error");
            return;
        }
        if (calcDays <= 0) {
            Swal.fire("ผิดพลาด", "จำนวนวันต้องมากกว่า 0!", "error");
            return;
        }

        onSave({
            role,
            days: parseInt(days),
            start: startDate.format("YYYY-MM-DD"),
            end: endDate.format("YYYY-MM-DD"),
            member,
            remark
        });
    };

    const filteredRoles = roleOptions.filter((r) =>
        r.label.toLowerCase().includes(roleFilter.toLowerCase())
    );

    const toggleMember = (name) => {
        setData((prev) => {
            const exists = prev.member.includes(name);
            return {
                ...prev,
                member: exists ? prev.member.filter((m) => m !== name) : [...prev.member, name],
            };
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-purple-600 mb-4">
                    {editData ? "✏ แก้ไขตำแหน่งงาน" : "➕ เพิ่มตำแหน่งงาน"}
                </h2>
                <div className="space-y-4">
                    {/* ✅ Dropdown ตำแหน่ง */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ตำแหน่ง"
                            className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
                            value={data.role}
                            onChange={(e) => {
                                handleChange("role", e.target.value);
                                setRoleFilter(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                        />
                        {showDropdown && (
                            <ul className="absolute w-full bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto shadow-md z-50">
                                {filteredRoles.length > 0 ? (
                                    filteredRoles.map((r, idx) => (
                                        <li
                                            key={idx}
                                            onClick={() => {
                                                handleChange("role", r.label); // ✅ ใช้ r.label
                                                setRoleFilter("");
                                                setShowDropdown(false);
                                            }}
                                            className="px-4 py-2 hover:bg-purple-100 cursor-pointer"
                                        >
                                            {r.label}
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-4 py-2 text-gray-500">ไม่พบตำแหน่ง</li>
                                )}
                            </ul>
                        )}
                    </div>

                    {/* ✅ จำนวนวัน */}
                    <input
                        type="number"
                        placeholder="จำนวนวัน"
                        className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
                        value={data.days}
                        onChange={(e) => handleChange("days", e.target.value)}
                    />

                    {/* ✅ วันที่เริ่ม - สิ้นสุด */}
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

                    {/* 👥 เลือกสมาชิก */}
                    <div>
                        <p className="font-semibold mb-2">สมาชิก:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {memberOptions.map((m) => (
                                <div
                                    key={m.label}
                                    onClick={() => toggleMember(m.label)}
                                    style={{
                                        backgroundColor: data.member.includes(m.label) ? m.color : "#f3f4f6",
                                        color: data.member.includes(m.label) ? m.textcolor : "#333",
                                    }}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg cursor-pointer shadow hover:scale-105 transition"
                                >
                                    {m.image && (
                                        <span
                                            className="w-6 h-6 mb-1"
                                            dangerouslySetInnerHTML={{ __html: m.image }}
                                        />
                                    )}
                                    <span className="text-xs truncate">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* 📝 Detail */}
                    <div>
                        <p className="font-semibold mb-2">รายละเอียด (Detail):</p>
                        <textarea
                            placeholder="เพิ่มหมายเหตุ..."
                            className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300 resize-none"
                            rows="3"
                            value={data.detail}
                            onChange={(e) => handleChange("detail", e.target.value)}
                        />
                    </div>
                    {/* 📝 Remark */}
                    <div>
                        <p className="font-semibold mb-2">หมายเหตุ (Remark):</p>
                        <textarea
                            placeholder="เพิ่มหมายเหตุ..."
                            className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300 resize-none"
                            rows="3"
                            value={data.remark}
                            onChange={(e) => handleChange("remark", e.target.value)}
                        />
                    </div>
                </div>

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
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}
