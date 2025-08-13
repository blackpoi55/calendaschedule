import { useState, useEffect } from "react";
import dayjs from "dayjs";
import Swal from "sweetalert2"; 

export default function AddProjectModal({ onClose, onSave, editData }) {
    const today = dayjs();
    const [formData, setFormData] = useState({
        name: "", 
        startDate: today.format("YYYY-MM-DD"),
        endDate: today.add(7, "day").format("YYYY-MM-DD"),
        totalDays: 8, // ✅ เพิ่มช่องวัน
    }); 

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
        } else {
            setFormData((prev) => ({
                ...prev,
                totalDays: dayjs(prev.endDate).diff(dayjs(prev.startDate), "day") + 1,
            }));
        }
    }, [editData]);

    // ✅ handleChange พร้อม auto-calc
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
                updated.totalDays = dayjs(updated.endDate).diff(dayjs(updated.startDate), "day") + 1;
            }

            if (field === "totalDays" && value > 0) {
                updated.endDate = start.add(parseInt(value) - 1, "day").format("YYYY-MM-DD");
            }

            return updated;
        });
    };

    // ✅ Save
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

        const project = {
            id: editData ? editData.id : "",
            name, 
            startDate,
            endDate,
            totalDays,
            details: editData ? editData.details : [],
        };

        onSave(project); 
    };
 

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-purple-600 mb-4">
                    {editData ? "✏️ แก้ไขโปรเจค" : "➕ เพิ่มโปรเจคใหม่"}
                </h2>
                <div className="space-y-3">
                    {/* ชื่อโปรเจค */}
                    <input
                        type="text"
                        placeholder="ชื่อโปรเจค"
                        className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                    />

                
                    {/* ✅ จำนวนวัน */}
                    <input
                        type="number"
                        className="w-full p-3 border rounded-lg focus:ring focus:ring-purple-300"
                        placeholder="จำนวนวัน (auto)"
                        value={formData.totalDays}
                        onChange={(e) => handleChange("totalDays", e.target.value)}
                    />
                    {/* ✅ วันที่ + จำนวนวัน */}
                    <div className="flex gap-3">
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
                    </div>


                </div>

                {/* ปุ่ม */}
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
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
