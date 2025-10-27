'use client';

import { useEffect, useState } from "react";
import { bucode, statusOptions, sortOptions, priorityOptions, projectOptions, devOptions, modulesOptions, typeOptions } from "../../config";
import { useRouter } from 'next/navigation'
import Swal from "sweetalert2";
//import * as XLSX from "xlsx";
//import { color } from "html2canvas/dist/types/css/types/color";
// Type definition for each bug report case

function Page() {
  const [selectedDev, setSelectedDev] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const devList = selectedDev ? selectedDev.split(",") : [];
  const [searchTerm, setSearchTerm] = useState("");
  const [prioritFilter, setprioritFilter] = useState("");
  const [devFilter, setdevFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("resolved");
  const [sortBy, setSortBy] = useState("createdat-desc");
  const [selectedCase, setSelectedCase] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [devmode, setdevmode] = useState(true)
  const [modulesFilter, setmodulesFilter] = useState("");
  const [typeFilter, settypeFilter] = useState("");
  const router = useRouter()
  // ✅ ย้าย window.location.search เข้า useEffect (ฝั่ง client เท่านั้น)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search)
      const godmode = searchParams.get("godmode")

      if (godmode === "admin") {
        localStorage.setItem("edomdog", "cvf,bo")
        router.push("/casereport")
      }
    }
  }, [router])

  useEffect(() => {
    const checkmode = localStorage.getItem("edomdog")
    setdevmode(checkmode === "cvf,bo")
    setStatusFilter(checkmode === "cvf,bo" ? "pending" : "resolved")
    refresh()
  }, [])
  const refresh = async () => {
    const response = await fetch("https://api-h-series.telecorp.co.th/api/bugreport/getbyCode/" + bucode, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    });

    const result = await response.json();

    if (Array.isArray(result.data)) {
      setCases(result.data);
    } else {
      console.warn("⚠️ result.data is not array:", result.data);
      setCases([]);
    }
  };


  const handleStatusUpdate = async (data, newStatus) => {
    // const res = await updatebugstatus({ status: newStatus }, data.id);
    const response = await fetch("https://api-h-series.telecorp.co.th/api/bugreport/" + data.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }), // ส่ง payload ไปยัง API
    });

    const result = await response.json();
    if (result) {
      refresh();
      setIsModalOpen(false);
    } else {
      Swal.fire({
        icon: "error",
        title: "อัปเดตสถานะไม่สำเร็จ",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };
  const updateRemarkClick = async () => {
    // const res = await updatebugstatus({ status: newStatus }, data.id);
    const response = await fetch("https://api-h-series.telecorp.co.th/api/bugreport/" + selectedCase?.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        s_remarks: selectedCase?.s_remarks, c_remarks: selectedCase?.c_remarks,
        person: selectedDev, type: selectedCase?.type || "Issue", modules: selectedCase?.modules || "Inventory"
        , completion_date: selectedCase?.completion_date
      }), // ส่ง payload ไปยัง API
    });

    const result = await response.json();
    if (result) {
      Swal.fire({
        icon: "success",
        title: "บันทึกหมายเหตุสำเร็จ",
        timer: 2000,
        showConfirmButton: false,
      });
      refresh();
    } else {
      Swal.fire({
        icon: "error",
        title: "บันทึกหมายเหตุไม่สำเร็จ",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold";
      case "devdone":
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold"
        case "testdone":
        return "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold"
      case "pending":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold";
      case "rejected":
        return "bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold";
      default:
        return "bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold";
    }
  };

  const getpriorityClass = (priority) => {
    switch (priority) {
      case "1 วิกฤติ":
        return "bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold";
      case "2 สูง":
        return "bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold";
      case "3 ปานกลาง":
        return "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold";
      case "4 ต่ำ":
        return "bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold";
      default:
        return "bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold";
    }
  };

  const filteredCases = cases
    ?.filter((c) => {
      const search = searchTerm.toLowerCase();
      return (
        ((c.id || "").toLowerCase().includes(search) ||
          (c.title || "").toLowerCase().includes(search) ||
          (c.description || "").toLowerCase().includes(search) ||
          (c.module || "").toLowerCase().includes(search) ||
          (c.modules || "").toLowerCase().includes(search) ||
          (c.type || "").toLowerCase().includes(search) ||
          (c.url || "").toLowerCase().includes(search) ||
          (c.reporter || "").toLowerCase().includes(search) ||
          (c.s_remarks || "").toLowerCase().includes(search) ||
          (c.c_remarks || "").toLowerCase().includes(search) ||
          (c.status || "").toLowerCase().includes(search)) &&
        (statusFilter === "" || c.status === statusFilter) &&
        (prioritFilter === "" || c.priority === prioritFilter) &&
        (modulesFilter === "" || c.modules === modulesFilter) &&
        (typeFilter === "" || c.type === typeFilter) &&
        (devFilter === "" || (c.person ? c.person.split(",").includes(devFilter) : false))
      );
    })
    .sort((a, b) => {
      if (sortBy === "createdat-asc") {
        return new Date(a.createdat).getTime() - new Date(b.createdat).getTime();
      } else {
        return new Date(b.createdat).getTime() - new Date(a.createdat).getTime();
      }
    });


  const countByStatus = (status) =>
    cases?.filter((c) => c.status === status).length;
  const checkProjectname = () => {
    let project = projectOptions.find((x) => x.value == bucode)
    return project?.label || ""
  }
  const toggle = (value) => {
    const exists = devList.includes(value);
    const newList = exists
      ? devList.filter((v) => v !== value)
      : [...devList, value];
    setSelectedDev(newList.join(","));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const value = e.dataTransfer.getData("text/plain");
    if (!value || devList.includes(value)) return;
    setSelectedDev([...devList, value].join(","));
  };

  const handleDragStart = (index) => () => {
    setDraggedIndex(index);
  };

  const handleDragOver = (index) => (e) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const reordered = [...devList];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, moved);
    setDraggedIndex(index);
    setSelectedDev(reordered.join(","));
  };

  // const exportExcel = () => {
  //   // แปลงข้อมูลเป็น array ของ object สำหรับ export
  //   const exportData = filteredCases.map((item, idx) => ({
  //     "ลำดับ": idx + 1,
  //     "วันที่แจ้ง": new Date(item.createdat).toLocaleString("th-TH"),
  //     "ชื่อเคส": item.title,
  //     "ผู้รายงาน": item.reporter,
  //     "โมดูล": item.modules,
  //     "ประเภทที่แจ้ง": item.type,
  //     "หมายเหตุ (system)": item.s_remarks,
  //     "หมายเหตุ (customer)": item.c_remarks,
  //     "ผู้ดูแล": item.person,
  //     "สถานะ": item.status,
  //     "ความรุนแรง": item.priority,
  //     "กำหนดวันแล้วเสร็จ": item.completion_date ? new Date(item.completion_date).toLocaleDateString("th-TH") : "",
  //   }));

  //   const ws = XLSX.utils.json_to_sheet(exportData);
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, "Cases");
  //   XLSX.writeFile(wb, "casereport.xlsx");
  // }
  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 min-h-screen text-black">
      <div className="flex w-full items-center">
        <div className="w-1/3 flex justify-start items-center">
          <h1 onClick={() => router.push("/casereport/dashboard")} className="text-3xl font-bold text-gray-800 cursor-pointer">📊 Dashboard Report Case </h1>
        </div>
        <div className="w-1/3 flex justify-center items-center">
          <label className=" p-2 bg-pink-500 rounded-lg text-white"> Project : {checkProjectname()}</label>
        </div>
        <div className="w-1/3 flex justify-end items-center ">
          <label className="p-2 bg-green-500 rounded-lg text-white">Mode : {devmode ? "DEV" : "USER"}</label>
        </div>
        <div className="w-1/3 flex justify-end items-center ">
          <button
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            // onClick={exportExcel}
          >
            Export Excel
          </button>
        </div>

      </div>
      <div className="flex flex-wrap gap-4 text-sm text-gray-700">
        <div className="bg-white px-4 py-2 rounded shadow">
          รวมทั้งหมด: <strong>{cases?.length}</strong> เคส
        </div>
        <div className="bg-yellow-50 px-4 py-2 rounded shadow text-yellow-800">
          🟡 Pending: <strong>{countByStatus("pending")}</strong>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded shadow text-blue-800">
          💻 Dev Done: <strong>{countByStatus("devdone")}</strong>
        </div>
         <div className="bg-blue-50 px-4 py-2 rounded shadow text-blue-800">
          💻 Test Done: <strong>{countByStatus("testdone")}</strong>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded shadow text-green-800">
          ✅ Resolved: <strong>{countByStatus("resolved")}</strong>
        </div>
        <div className="bg-red-50 px-4 py-2 rounded shadow text-red-800">
          ❌ Rejected: <strong>{countByStatus("rejected")}</strong>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full md:items-center">
        <input
          type="text"
          placeholder="🔍 ค้นหาทุกช่อง..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={prioritFilter}
          onChange={(e) => setprioritFilter(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm w-full md:w-1/4 focus:outline-none"
        // disabled={!devmode}
        >
          {priorityOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={modulesFilter}
          onChange={(e) => setmodulesFilter(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm w-full md:w-1/4 focus:outline-none"
        // disabled={!devmode}
        >
          {modulesOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => settypeFilter(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm w-full md:w-1/4 focus:outline-none"
        // disabled={!devmode}
        >
          {typeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={devFilter}
          onChange={(e) => setdevFilter(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm w-full md:w-1/4 focus:outline-none"
        // disabled={!devmode}
        >
          <option value={""}>เลือกผู้ดูแล</option>
          {devOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm w-full md:w-1/4 focus:outline-none"
        // disabled={!devmode}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg shadow-sm w-full md:w-1/4 focus:outline-none"
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-blue-100 text-gray-700 text-sm uppercase">
              <th className="p-3 text-center w-[50px] min-w-[60px]">คัดลอก ID</th>
              <th className="p-3 text-center w-[50px] min-w-[60px]">#</th>
              <th className="p-3 text-left w-[100px] min-w-[160px]">วันที่แจ้ง</th>
              <th className="p-3 text-left w-[100px] min-w-[120px]">ความรุนแรง</th>
              <th className="p-3 text-left  ">ชื่อเคส</th>
              <th className="p-3 text-left w-[100px] min-w-[120px]">ผู้รายงาน</th>
              <th className="p-3 text-left">โมดูล</th>
              <th className="p-3 text-left">ประเภทที่แจ้ง</th>
              <th className="p-3 text-left">หมายเหตุ (system)</th>
              <th className="p-3 text-left">ผู้ดูแล</th>
              <th className="p-3 text-left">สถานะ</th>
              <th className="p-3 text-left">กำหนดวันแล้วเสร็จ</th>
              <th className="p-3 text-center">ดูเพิ่มเติม</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-600">
            {filteredCases?.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50 border-b">
                <td className="p-3 ">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.id);
                      Swal.fire({
                        icon: "success",
                        title: "คัดลอกเรียบร้อย",
                        text: `คัดลอกไอดีของเคส ${item.title} แล้ว`,
                        timer: 1500,
                        showConfirmButton: false,
                      });
                    }}
                    className="px-4 py-1 bg-orange-600 text-white rounded-full hover:bg-orange-700 text-xs shadow"
                  >
                    💾
                  </button>
                </td>
                <td className="p-3 text-center">{index + 1}</td>
                <td className="p-3 text-xs break-all">
                  {new Date(item.createdat).toLocaleString("th-TH", {
                    hour12: false,         // ปิดรูปแบบ 12 ชั่วโมง
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })}
                </td>
                <td className="p-3">
                  <span className={getpriorityClass(item.priority)}>{item.priority || "-"}</span>
                </td>
                <td className="p-3">{item.title || "-"}</td>
                <td className="p-3">{item.reporter || "-"}</td>
                <td className="p-3">{item.modules || "-"}</td>
                <td className="p-3">{item.type || "-"}</td>
                <td className="p-3">
                  {item.s_remarks
                    ? (item.s_remarks.length > 50
                      ? item.s_remarks.slice(0, 50) + "..."
                      : item.s_remarks)
                    : "-"}
                </td>

                <td className="p-3">
                  <div className="flex">
                    {(item.person ? item.person.split(",") : []).map((value, index) => {
                      const item = devOptions.find((x) => x.value === value);
                      if (!item) return null;

                      return (
                        <div
                          key={value}
                          draggable
                          onDragStart={handleDragStart(index)}
                          onDragOver={handleDragOver(index)}
                          style={{ backgroundColor: item.color || "black", color: item.textcolor || "white" } } // กำหนด type ให้กับ style
                          className={`flex flex-col items-center justify-center  text-xs p-2 rounded-full w-10 h-10 shadow-md mr-1`}
                        >
                          {/* ✅ SVG แสดงด้วย dangerouslySetInnerHTML */}
                          {item.image && (
                            <span
                              className="w-3 h-3"
                              dangerouslySetInnerHTML={{ __html: item.image }}
                            />
                          )}
                          <span className="truncate">{item.label}</span>
                        </div>
                      );
                    })}</div></td>
                {/* <td className="p-3 max-w-[200px] truncate">{item.module||"-"}</td>
                <td className="p-3 max-w-[200px] truncate">{item.url||"-"}</td> */}
                <td className="p-3">
                  <span className={getStatusClass(item.status)}>{item.status || "-"}</span>
                </td>
                <td className="p-3 text-xs break-all">{item.completion_date ? new Date(item.completion_date).toLocaleDateString("th-TH") : "-"}</td>
                <td className="p-3 text-center">
                  <button
                    className="px-4 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-xs shadow"
                    onClick={() => {
                      setSelectedDev(item?.person || "");
                      setSelectedCase(item)
                      setIsModalOpen(true)
                    }}
                  >
                    ดูรายละเอียด
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[98] ">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-8 relative animate-fadeIn max-h-[85vh] overflow-x-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl"
            >
              &times;
            </button>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <img
                  src={selectedCase.screenshotpath}
                  alt="case screenshot"
                  className="w-full h-auto rounded border cursor-pointer hover:shadow-lg transition"
                  onClick={() => setIsImagePreviewOpen(true)}
                />
                <p className=" mt-4"><strong>ผู้รายงาน:</strong> {selectedCase.reporter}</p>
                <p className=" mt-4"><strong>URL:</strong> <a href={selectedCase.url} target="_blank" className="text-blue-600 underline break-all text-[10px]">{selectedCase.url}</a></p>
                <p className=" mt-4"><strong>โมดูล:</strong> <a href={selectedCase.module} target="_blank" className="text-pink-600 underline break-all">คลิกเพื่อวาร์ป(ของระบบ)</a></p>
                <p className=" mt-4"><strong>รายละเอียด:</strong></p>
                <p className="bg-gray-100 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">{selectedCase.description}</p>
                <p className="text-sm text-gray-400 mt-10">🕒 วันที่แจ้ง:  {new Date(selectedCase.createdat).toLocaleString("th-TH", {
                  hour12: false,         // ปิดรูปแบบ 12 ชั่วโมง
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                })}</p>

                {/* 🚨 modules */}
                <div className="mb-2">
                  <label className="block mb-1 font-medium">modules</label>
                  <select
                    className="w-full border rounded p-2"
                    value={selectedCase?.modules}
                    onChange={(e) =>
                      setSelectedCase((prev) => ({ ...prev, modules: e.target.value }))
                    }
                  >
                    <option value="Inventory">🟢 Inventory</option>
                    <option value="QA">🟠 QA</option>
                    <option value="LAB/Admin">🔴 LAB/Admin</option>
                    <option value="Equipment">🚨 Equipment</option>
                    <option value="Variance">🚨 Variance</option>
                    <option value="Setting">🚨 Setting</option>
                  </select>
                </div>
                {/* 🚨 Type */}
                <div className="mb-2">
                  <label className="block mb-1 font-medium">ประเภทที่แจ้ง</label>
                  <select
                    className="w-full border rounded p-2"
                    value={selectedCase.type}
                    onChange={(e) =>
                      setSelectedCase((prev) => ({ ...prev, type: e.target.value }))
                    }
                  >
                    <option value="Issue">🟢 Issue</option>
                    <option value="ขอเพิ่มเงื่อนไข/ปรับการแสดงผล">🟠 ขอเพิ่มเงื่อนไข/ปรับการแสดงผล</option>
                    <option value="คำถาม/ปรึกษา">🔴 คำถาม/ปรึกษา</option>
                    <option value="Change Request">🚨 Change Request</option>
                    <option value="User Error">🚨 User Error</option>
                    <option value="Bug">🚨 Bug</option>
                  </select>
                </div>

              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">{selectedCase.title}</h2>
                <p><strong>ระดับความรุนแรง:</strong> <span className={getpriorityClass(selectedCase.priority)}>{selectedCase.priority || "-"}</span></p>
                <p><strong>สถานะ:</strong> <span className={getStatusClass(selectedCase.status)}>{selectedCase.status}</span></p>
                {devmode ?
                  <>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleStatusUpdate(selectedCase, "pending")}
                        className="px-4 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                      >
                        🟡 Pending
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedCase, "devdone")}
                        className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        💻 Dev Done
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedCase, "testdone")}
                        className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        💻 Test Done
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedCase, "resolved")}
                        className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        ✅ Mark Resolved
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedCase, "rejected")}
                        className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        ❌ Reject
                      </button>
                    </div>
                    <div className="w-full max-w-md space-y-4">
                      <p className="font-semibold text-gray-800">ผู้ดูแลเคส (Developer):</p>

                      {/* Selected Devs */}
                      <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className="flex flex-wrap gap-2 border border-dashed border-blue-400 p-3 rounded-lg bg-blue-50 min-h-[56px]"
                      >
                        {devList.length === 0 && (
                          <span className="text-sm text-blue-400 italic">
                            ลาก Dev มาวางตรงนี้...
                          </span>
                        )}
                        {devList.map((value, index) => {
                          const item = devOptions.find((x) => x.value === value);
                          if (!item) return null;

                          return (
                            <div
                              key={value}
                              draggable
                              onDragStart={handleDragStart(index)}
                              onDragOver={handleDragOver(index)}
                              style={{ backgroundColor: item.color || "black", color: item.textcolor || "white" }} // กำหนด type ให้กับ style
                              className={`flex items-center text-sm pl-3 pr-2 py-1 rounded-full shadow-md transition-all cursor-move`}
                            >
                              {/* ✅ SVG แสดงด้วย dangerouslySetInnerHTML */}
                              {item.image && (
                                <span
                                  className="w-5 h-5 mr-2"
                                  dangerouslySetInnerHTML={{ __html: item.image }}
                                />
                              )}
                              <span className="truncate">{item.label}</span>
                              <button
                                onClick={() => toggle(value)}
                                className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}

                      </div>

                      {/* Choices - Drag to select */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {devOptions
                          .filter((item) => !devList.includes(item.value))
                          .map((item) => (
                            <div
                              key={item.value}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("text/plain", item.value)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-grab bg-white border-gray-300 hover:border-blue-500 shadow hover:shadow-md transition-all group"
                            >
                              {/* SVG Icon */}
                              {item.image && (
                                <span
                                  className="w-5 h-5 group-hover:scale-110 transition-transform"
                                  dangerouslySetInnerHTML={{ __html: item.image }}
                                />
                              )}
                              <span className="truncate font-medium text-gray-800 group-hover:text-blue-600">
                                {item.label}
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* Debug display */}
                      <div className="text-xs text-gray-400 italic">
                        selectedDev: <code>{selectedDev || "—"}</code>
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block mb-1 font-medium">กำหนดวันแล้วเสร็จ (Completion Date)</label>
                      <input
                        type="date"
                        className="w-full border rounded p-2"
                        value={selectedCase.completion_date ? new Date(selectedCase.completion_date).toISOString().split('T')[0] : ''}
                        onChange={(e) =>
                          setSelectedCase((prev) => ({ ...prev, completion_date: e.target.value }))
                        }
                      />
                    </div>

                  </>
                  : <div className="w-full max-w-md space-y-4">
                    <p className="font-semibold text-gray-800">ผู้ดูแลเคส (Developer):</p>

                    {/* Selected Devs */}
                    <div
                      className="flex flex-wrap gap-2 border border-dashed border-blue-400 p-3 rounded-lg bg-blue-50 min-h-[56px]"
                    >
                      {devList.length === 0 && (
                        <span className="text-sm text-blue-400 italic">
                          ยังไม่ได้กำหนดผู้ดูแลเคส
                        </span>
                      )}
                      {devList.map((value, index) => {
                        const item = devOptions.find((x) => x.value === value);
                        if (!item) return null;

                        return (
                          <div
                            key={value}
                            style={{ backgroundColor: item.color || "black", color: item.textcolor || "white" }} // กำหนด type ให้กับ style
                            className="flex items-center  text-sm pl-3 pr-2 py-1 rounded-full shadow-md transition-all cursor-move"
                          >
                            {/* ✅ SVG แสดงด้วย dangerouslySetInnerHTML */}
                            {item.image && (
                              <span
                                className="w-5 h-5 mr-2"
                                dangerouslySetInnerHTML={{ __html: item.image }}
                              />
                            )}
                            <span className="truncate">{item.label}</span>
                          </div>
                        );
                      })}

                    </div>
                  </div>}

                <p><strong>หมายเหตุ (System):</strong></p>
                {/* <p className="bg-gray-100 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">{selectedCase.s_remarks}</p> */}
                <textarea
                  disabled={!devmode}
                  placeholder="หมายเหตุ (System)"
                  className="w-full border rounded p-2 h-20 mb-2"
                  value={selectedCase.s_remarks || ""}
                  onChange={(e) =>
                    setSelectedCase((prev) => ({ ...prev, s_remarks: e.target.value }))
                  }
                />
                <p><strong>หมายเหตุ (Customer):</strong></p>
                {/* <p className="bg-gray-100 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">{selectedCase.c_remarks}</p> */}
                <textarea
                  disabled={devmode}
                  placeholder="หมายเหตุ (Customer)"
                  className="w-full border rounded p-2 h-20 mb-2"
                  value={selectedCase.c_remarks || ""}
                  onChange={(e) =>
                    setSelectedCase((prev) => ({ ...prev, c_remarks: e.target.value }))
                  }
                />
                <button onClick={() => updateRemarkClick()} className="p-2 w-full rounded-2xl bg-green-500 text-center text-white">
                  บันทึกหมายเหตุ
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {isImagePreviewOpen && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[99]" onClick={() => setIsImagePreviewOpen(false)}>
          <img src={selectedCase.screenshotpath} alt="preview" className="max-h-[90vh] max-w-[90vw] rounded shadow-lg border" />
        </div>
      )}

    </div>
  );
}

export default Page;