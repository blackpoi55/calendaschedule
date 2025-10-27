"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import { subpath, bucode } from "../../config";


export default function ScreenshotTool() {
    const selectionRef = useRef(null);
    const fabricRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const [canvasUrl, setCanvasUrl] = useState(null);
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [fontSize, setFontSize] = useState(24);
    const [selectedColor, setSelectedColor] = useState("#ff0000");
    const [showInstruction, setShowInstruction] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(0.5); // ค่าเริ่มต้นคือ 1 (100%)
    const [isLoading, setIsLoading] = useState(false);
    const [screenshotValue, setscreenshotValue] = useState({
        "title": "",
        "description": "",
        "module": "",
        "url": "",
        "reporter": "",
        "screenshotpath": "",
        "priority": "4 ต่ำ",
        "modules": "",
        "type": ""
    });

    const [origin, setOrigin] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const url = window.location.origin + (subpath || "") + "/casereport";
            setOrigin(url);
        }
    }, []);
    useEffect(() => {
        const canvas = fabricRef.current;
        if (!canvas || !canvasUrl) return;

        // อัปเดตขนาดใหม่
        canvas.setDimensions({
            width: canvasSize.width * zoomLevel,
            height: canvasSize.height * zoomLevel,
        });

        if (canvas.backgroundImage) {
            canvas.backgroundImage.scaleX = (canvasSize.width * zoomLevel) / canvas.backgroundImage.width;
            canvas.backgroundImage.scaleY = (canvasSize.height * zoomLevel) / canvas.backgroundImage.height;
        }

        canvas.requestRenderAll();
    }, [zoomLevel]);
    useEffect(() => {
        if (typeof window !== "undefined") {
            const isMobile = window.innerWidth <= 768;
            setZoomLevel(isMobile ? 0.5 : 1);

            const width = Math.min(window.innerWidth * 0.9, 800);
            const height = width * 0.75;
            setCanvasSize({ width, height });
        }
    }, []);

    useEffect(() => {
        const handlePasteImage = async () => {
            try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                    if (item.types.includes("image/png")) {
                        const blob = await item.getType("image/png");
                        const dataUrl = URL.createObjectURL(blob);

                        // ตั้งค่าภาพไปที่ editor
                        setCanvasUrl(dataUrl);

                        // โหลดขนาดภาพเพื่อตั้งค่า canvas
                        const img = new Image();
                        img.onload = () => {
                            setCanvasSize({ width: img.width, height: img.height });
                            setIsEditing(true); // เปิดโหมดแก้ไข
                        };
                        img.src = dataUrl;
                    }
                }
            } catch (err) {
                console.error("ไม่สามารถอ่านภาพจาก Clipboard:", err);
            }
        };

        const keyListener = (e) => {
            // ✅ รองรับ Ctrl+V (กรณีกด PrintScreen แล้วกด Paste เอง)
            if (e.ctrlKey && (e.key === "b" || e.key === "B" || e.key === "ิ" || e.key === "ฺ")) {
                handlePasteImage();
            }
        };

        document.addEventListener("keydown", keyListener);
        return () => document.removeEventListener("keydown", keyListener);
    }, []);

    useEffect(() => {
        const key = (e) => {
            if (e.ctrlKey && ["q", "Q", "ๆ", "๐"].includes(e.key)) {
                e.preventDefault();
                startCapture();
            }
        };
        document.addEventListener("keydown", key);
        return () => document.removeEventListener("keydown", key);
    }, []);

    const startCapture = () => {
        setShowInstruction(true);

        if (selectionRef.current) {
            selectionRef.current.remove();
            selectionRef.current = null;
        }

        const box = document.createElement("div");
        box.style.position = "fixed";
        box.style.border = "2px solid red";
        box.style.zIndex = "9999";
        box.style.pointerEvents = "none";
        box.style.display = "none";
        document.body.appendChild(box);
        selectionRef.current = box;

        let startX = 0, startY = 0;

        function begin(x, y) {
            setShowInstruction(false);
            startX = x;
            startY = y;

            document.body.style.userSelect = "none";
            document.body.style.cursor = "crosshair";

            if (selectionRef.current) {
                Object.assign(selectionRef.current.style, {
                    left: `${startX}px`,
                    top: `${startY}px`,
                    width: "0px",
                    height: "0px",
                    display: "block",
                });
            }
        }

        function move(x, y) {
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            const left = Math.min(x, startX);
            const top = Math.min(y, startY);

            if (selectionRef.current) {
                Object.assign(selectionRef.current.style, {
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                });
            }
        }

        async function finishCapture() {
            document.body.style.userSelect = "auto";
            document.body.style.cursor = "default";

            if (!selectionRef.current) return;

            const rect = selectionRef.current.getBoundingClientRect();
            selectionRef.current.remove();
            selectionRef.current = null;

            const captured = await html2canvas(document.body, {
                x: rect.left + window.scrollX,
                y: rect.top + window.scrollY,
                width: rect.width,
                height: rect.height,
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.scrollWidth,
                windowHeight: document.documentElement.scrollHeight,
            });

            const dataUrl = captured.toDataURL();
            setCanvasUrl(dataUrl);
            setCanvasSize({ width: captured.width, height: captured.height });
            setIsEditing(true);
        }

        // Mouse Events
        function onMouseDown(e) {
            begin(e.clientX, e.clientY);
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        }

        function onMouseMove(e) {
            move(e.clientX, e.clientY);
        }

        async function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            await finishCapture();
        }

        // Touch Events
        function onTouchStart(e) {
            const touch = e.touches?.[0];
            if (!touch) return;

            begin(touch.clientX, touch.clientY);
            document.addEventListener("touchmove", onTouchMove);
            document.addEventListener("touchend", onTouchEnd);
        }

        function onTouchMove(e) {
            const touch = e.touches?.[0];
            if (!touch) return;

            move(touch.clientX, touch.clientY);
        }

        async function onTouchEnd() {
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            await finishCapture();
        }

        document.addEventListener("mousedown", onMouseDown, { once: true });
        document.addEventListener("touchstart", onTouchStart, { once: true });
    };


    useEffect(() => {
        if (isEditing && selectionRef.current) {
            selectionRef.current.remove();
            selectionRef.current = null;
        }
    }, [isEditing]);


    useEffect(() => {
        const setupCanvas = async () => {
            if (!isEditing || !canvasUrl) return;
            const fabricModule = await import("fabric");
            const fabric = fabricModule.fabric ?? fabricModule;
            if (fabricRef.current) fabricRef.current.dispose();
            const canvasEl = document.getElementById("screenshot-canvas");
            if (!canvasEl) return;
            const canvas = new fabric.Canvas(canvasEl, {
                width: canvasSize.width,
                height: canvasSize.height,
            });
            const image = new Image();
            image.onload = () => {
                canvas.setDimensions({
                    width: canvasSize.width * zoomLevel,
                    height: canvasSize.height * zoomLevel,
                });

                const fabricImg = new fabric.Image(image, {
                    scaleX: (canvasSize.width * zoomLevel) / image.width,
                    scaleY: (canvasSize.height * zoomLevel) / image.height,
                    selectable: false,
                    evented: false,
                });

                canvas.backgroundImage = fabricImg;
                canvas.renderAll();
            };
            image.onerror = () => console.error("โหลดภาพไม่สำเร็จ");
            image.crossOrigin = "anonymous";
            image.src = canvasUrl;
            fabricRef.current = canvas;
            canvas.on("mouse:down", (e) => {
                if (e.target) {
                    canvas.setActiveObject(e.target);
                    const obj = e.target;
                    // ตรวจสอบว่าเป็น text หรือ rect หรือ group (arrow)
                    if (obj.type === "i-text") {
                        setSelectedColor(obj.fill || "#000000");
                        setFontSize(obj.fontSize || 24); // 👉 ดึงขนาดมาแสดง
                    } else if (obj.type === "rect") {
                        setSelectedColor(obj.stroke || "#000000");
                    } else if (obj.type === "group") {
                        const line = obj.item(0); // ลูกศรมี line เป็นตัวแรก
                        setSelectedColor(line.stroke || "#000000");
                    } else if (obj.type === "circle") {
                        setSelectedColor(obj.stroke || "#000000");
                    }
                    else if (obj.path && obj.path.length > 0) {
                        setSelectedColor(obj.stroke || "#000000");
                    }
                }
            });


            const handleDelete = (e) => {
                if ((e.key === "Delete") && canvas.getActiveObject()) {
                    canvas.remove(canvas.getActiveObject());
                    canvas.discardActiveObject();
                    canvas.requestRenderAll();
                }
            };
            let copiedObject = null;

            // ✅ กด Ctrl+C เพื่อ copy
            const handleCopy = async (e) => {
                if (e.ctrlKey && (e.key === "c" || e.key === "C" || e.key === "แ" || e.key === "ฉ")) {
                    const active = canvas.getActiveObject();
                    if (active) {
                        try {
                            const cloned = await active.clone();
                            copiedObject = cloned;
                        } catch (err) {
                            console.error("Clone failed:", err);
                        }
                    }
                }
            };

            // ✅ กด Ctrl+V เพื่อ paste
            const handlePaste = async (e) => {
                if (e.ctrlKey && (e.key === "v" || e.key === "V" || e.key === "อ" || e.key === "ฮ") && copiedObject) {
                    try {
                        const clonedObj = await copiedObject.clone();
                        clonedObj.set({
                            left: (clonedObj.left || 0) + 20,
                            top: (clonedObj.top || 0) + 20,
                        });

                        canvas.discardActiveObject();
                        canvas.add(clonedObj);
                        canvas.setActiveObject(clonedObj);
                        canvas.requestRenderAll();
                    } catch (err) {
                        console.error("Paste failed:", err);
                    }
                }
            };

            document.addEventListener("keydown", handleCopy);
            document.addEventListener("keydown", handlePaste);
            document.addEventListener("keydown", handleDelete);


            return () => {
                canvas.dispose();
                document.removeEventListener("keydown", handleDelete);
                document.removeEventListener("keydown", handleCopy);
                document.removeEventListener("keydown", handlePaste);

            };

        };
        setupCanvas();
    }, [isEditing, canvasUrl]);

    const addText = async () => {
        const fabricModule = await import("fabric");
        const fabric = fabricModule.fabric ?? fabricModule;
        const canvas = fabricRef.current;
        if (!canvas) return;
        const text = new fabric.IText("ใส่ข้อความ", {
            left: canvas.width / 2,
            top: canvas.height / 2,
            fill: selectedColor,
            fontSize: fontSize,
            originX: "center",
            originY: "center",
        });
        canvas.add(text);
    };
    const addBlurRegion = async () => {
        const fabricModule = await import("fabric");
        const fabric = fabricModule.fabric ?? fabricModule;
        const canvas = fabricRef.current;
        if (!canvas || !canvas.backgroundImage) return;


        const rect = new fabric.Rect({
            left: canvas.width / 2 - 50,
            top: canvas.height / 2 - 30,
            width: 100,
            height: 60,
            selectable: true,
            hasBorders: true,
            hasControls: true,
            strokeWidth: 1,
            strokeUniform: true,
            fill: new fabric.Pattern({
                source: (() => {
                    const patternCanvas = document.createElement("canvas");
                    const size = 10; // 👈 ยิ่งเล็ก = ยิ่งถี่
                    patternCanvas.width = size * 2;
                    patternCanvas.height = size * 2;

                    const ctx = patternCanvas.getContext("2d");

                    ctx.fillStyle = "rgba(200, 200, 200, 0.9)";
                    ctx.fillRect(0, 0, size, size);

                    ctx.fillStyle = "rgba(100, 100, 100, 0.9)";
                    ctx.fillRect(size, 0, size, size);

                    ctx.fillStyle = "rgba(100, 100, 100, 0.9)";
                    ctx.fillRect(0, size, size, size);

                    ctx.fillStyle = "rgba(200, 200, 200, 0.9)";
                    ctx.fillRect(size, size, size, size);

                    return patternCanvas;
                })(),
                repeat: "repeat",
            }),
        });


        canvas.add(rect);
        canvas.setActiveObject(rect);

        // 👉 เพิ่ม listener สำหรับ double click เพื่อเบลอ
        rect.on("mousedblclick", async () => {
            const left = rect.left ?? 0;
            const top = rect.top ?? 0;
            const width = rect.width ?? 100;
            const height = rect.height ?? 60;

            // ทำภาพซ้ำเฉพาะพื้นที่ที่เลือก
            const imageEl = new Image();
            imageEl.crossOrigin = "anonymous";
            imageEl.src = canvasUrl;

            imageEl.onload = () => {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = width;
                tempCanvas.height = height;
                const ctx = tempCanvas.getContext("2d");
                if (!ctx) return;

                ctx.drawImage(
                    imageEl,
                    left / canvas.getZoom(),
                    top / canvas.getZoom(),
                    width / canvas.getZoom(),
                    height / canvas.getZoom(),
                    0,
                    0,
                    width,
                    height
                );

                const croppedUrl = tempCanvas.toDataURL();

                fabric.Image.fromURL(croppedUrl, (img) => {
                    img.set({
                        left,
                        top,
                        scaleX: 1,
                        scaleY: 1,
                        selectable: true,
                    });

                    // 👉 ใส่ filter เบลอ
                    img.filters = [
                        new fabric.Image.filters.Blur({ blur: 1 }),
                        new fabric.Image.filters.Noise({ noise: 800 }),
                    ];
                    img.applyFilters();

                    canvas.add(img);
                    canvas.remove(rect);
                    canvas.requestRenderAll();
                });
            };
        });
    };

    const addBox = async () => {
        const fabricModule = await import("fabric");
        const fabric = fabricModule.fabric ?? fabricModule;
        const canvas = fabricRef.current;
        if (!canvas) return;
        const rect = new fabric.Rect({
            left: canvas.width / 2,
            top: canvas.height / 2,
            width: 120,
            height: 80,
            stroke: selectedColor,
            strokeWidth: 3,
            fill: "transparent",
            originX: "center",
            originY: "center",
            selectable: true,
            strokeUniform: true,
        });
        canvas.add(rect);
    };

    const addArrow = async () => {
        const fabricModule = await import("fabric");
        const fabric = fabricModule.fabric ?? fabricModule;
        const canvas = fabricRef.current;
        if (!canvas) return;
        const x1 = canvas.width / 2 - 50;
        const y1 = canvas.height / 2;
        const x2 = canvas.width / 2 + 50;
        const y2 = canvas.height / 2;
        const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: selectedColor,
            strokeWidth: 4,
            selectable: false,
        });
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        const arrowHead = new fabric.Triangle({
            left: x2,
            top: y2,
            originX: "center",
            originY: "center",
            angle: angle + 90,
            width: 12,
            height: 14,
            fill: selectedColor,
            selectable: false,
        });
        const arrowGroup = new fabric.Group([line, arrowHead], {
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: "center",
            originY: "center",
            selectable: true,
        });
        canvas.add(arrowGroup);
    };
    // 👉 เพิ่มฟังก์ชันวาดวงกลม
    const addCircle = async () => {
        const fabricModule = await import("fabric");
        const fabric = fabricModule.fabric ?? fabricModule;
        const canvas = fabricRef.current;
        if (!canvas) return;
        const circle = new fabric.Circle({
            left: canvas.width / 2,
            top: canvas.height / 2,
            radius: 50,
            stroke: selectedColor,
            strokeWidth: 3,
            fill: "transparent",
            originX: "center",
            originY: "center",
            selectable: true,
        });
        circle.setControlsVisibility({
            mtr: false // ซ่อนปุ่มหมุน (ถ้าไม่ต้องการ)
        });
        circle.on("selected", () => {
            setSelectedColor(circle.stroke || "#000000");
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
    };

    // 👉 เปิดใช้งานโหมดดินสอวาด
    const enableFreeDrawing = async () => {
        const fabricModule = await import("fabric");
        const fabric = fabricModule.fabric ?? fabricModule;
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.isDrawingMode = !canvas.isDrawingMode;

        if (canvas.isDrawingMode) {
            if (!canvas.freeDrawingBrush) {
                canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            }
            canvas.freeDrawingBrush.color = selectedColor;
            canvas.freeDrawingBrush.width = 2;
        }

        canvas.requestRenderAll();
    };

    const handleContinue = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const updatedDataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
        setCanvasUrl(updatedDataUrl);
        setSidePanelOpen(true);
        setIsEditing(false);
    };

    const handleSave = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `screenshot-${Date.now()}.png`;
        link.click();
    };

    const handleCopy = () => {
        const fabricCanvas = fabricRef.current;
        if (!fabricCanvas) return;

        // 🔁 ดึงเป็น <canvas> element ปกติ
        const actualCanvas = fabricCanvas.getElement(); // ใช้ getElement() แทน

        console.log("📸 แปลง canvas จริงเป็น blob...");
        actualCanvas.toBlob((blob) => {
            if (!blob) {
                console.error("❌ ไม่สามารถสร้าง blob จาก canvas");
                return;
            }

            console.log("✅ ได้ blob แล้ว", blob);
            const item = new ClipboardItem({ "image/png": blob });

            navigator.clipboard.write([item])
                .then(() => {
                    alert("✅ คัดลอกภาพสำเร็จแล้ว!");
                })
                .catch((err) => {
                    console.error("❌ Clipboard Error:", err);
                    alert("❌ ไม่สามารถคัดลอกภาพได้: " + err.message);
                });
        }, "image/png");
    };



    // google drive sheet
    // const handleSendData = async (payload) => {
    //     try {
    //         setIsLoading(true); // เริ่มโหลด

    //         const res = await fetch('/api/send-report', {
    //             method: 'POST',
    //             body: JSON.stringify(payload),
    //             headers: { 'Content-Type': 'application/json' },
    //         });

    //         const result = await res.json();
    //         if (!res.ok) throw new Error(result.error);

    //         Swal.fire({
    //             icon: 'success',
    //             title: 'ส่งข้อมูลสำเร็จ',
    //             text: 'ระบบได้รับข้อมูลของคุณเรียบร้อยแล้ว',
    //             timer: 2000,
    //             showConfirmButton: false,
    //         });

    //         setSidePanelOpen(false);
    //         resetScreenshotValue();
    //     } catch (err) {
    //         Swal.fire({
    //             icon: 'error',
    //             title: 'เกิดข้อผิดพลาด',
    //             text: err.message || 'ไม่สามารถส่งข้อมูลได้',
    //         });
    //     } finally {
    //         setIsLoading(false); // หยุดโหลด
    //     }
    // };

    const handleSendData = async (payload) => {
        // ✅ แปลงชื่อ field เป็นภาษาไทย
        const fieldMap = {
            title: "หัวข้อปัญหา",
            description: "รายละเอียด",
            priority: "ความรุนแรง",
            url: "ลิงก์หน้าเว็บ",
            reporter: "ชื่อผู้รายงาน",
        };

        // ✅ เช็ค required fields ก่อนส่ง
        const requiredFields = ["title", "description", "priority", "url", "reporter"];
        const missingFields = requiredFields.filter((field) => !payload[field]?.toString().trim());

        // ✅ แสดง alert ถ้ากรอกไม่ครบ
        if (missingFields.length > 0) {
            Swal.fire({
                icon: "warning",
                title: "กรุณากรอกข้อมูลให้ครบถ้วน",
                html: `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <img 
                    src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGIzeDh2NHAweG8xcmM2eHc4djU3a2Q3YXk4eDRxMW04OWN2cHV6MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/VbnUQpnihPSIgIXuZv/giphy.gif" 
                    width="200" 
                    style="margin-bottom: 10px;" 
                  />
                  <p style="margin: 0;">ข้อมูลที่ยังไม่ได้กรอก:</p>
                  <strong>${missingFields.map((f) => fieldMap[f] || f).join(", ")}</strong>
                </div>
              `,
                showConfirmButton: false,
                timer: 5000,
            });

            return;
        }


        try {
            setIsLoading(true);

            const response = await fetch("https://api-h-series.telecorp.co.th/api/bugreport", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!result.error) {
                console.log("✅ ส่งสำเร็จ:", result);

                Swal.fire({
                    icon: "success",
                    title: "ส่งข้อมูลสำเร็จ",
                    text: "ระบบได้รับข้อมูลของคุณเรียบร้อยแล้ว",
                    showConfirmButton: false,
                    timer: 2000,
                });

                setSidePanelOpen(false);
                resetScreenshotValue();
            } else {
                console.error("❌ ส่งข้อมูลล้มเหลว:", result.error);
                Swal.fire({
                    icon: "error",
                    title: "ส่งข้อมูลไม่สำเร็จ",
                    text: "กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ",
                    confirmButtonText: "ปิด",
                });
            }
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: err.message || "ไม่สามารถส่งข้อมูลได้",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetScreenshotValue = () => {
        setscreenshotValue({
            title: "",
            description: "",
            module: "",
            url: "",
            reporter: "",
            screenshotpath: "",
            priority: "4 ต่ำ",
            type: "Issue",
            modules: "Inventory",
            assignees: [], // ✅ ใส่ตรงนี้ด้วย
        });
    };



    return (
        <>
            {showInstruction && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 pointer-events-none text-black">
                    <div className="bg-white px-6 py-3 rounded-lg shadow-md text-center text-gray-800 text-lg font-medium animate-pulse">
                        กรุณาลากเพื่อเลือกส่วนที่ต้องการแคปหน้าจอ
                    </div>
                </div>
            )}
            {isLoading && (
                <div className="fixed inset-0 bg-white/20 backdrop-blur-md z-[9999] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                    <p className="mt-4 text-blue-600 text-lg font-semibold animate-pulse">กำลังโหลดข้อมูล...</p>
                </div>
            )}

            <button
                onClick={startCapture}
                className="no-print fixed bottom-2 left-2 z-[9999] w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-all duration-300"
                title="แคปหน้าจอ (Ctrl+Q) วางรูปภาพ (Ctrl+B)"
            >
                📷
            </button>
            <button
                onClick={() =>
                    window.open(origin, "_blank")
                }
                className="no-print fixed bottom-2 left-12 z-[9999] w-10 h-10 bg-green-500 text-white rounded-full shadow-md"
            >
                💬
            </button>


            {isEditing && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-[9998] flex flex-col items-center overflow-auto p-4 text-black">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2 w-full bg-white/90 backdrop-blur p-2 rounded shadow border max-w-5xl">
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            {/* ช่องเลือกสี */}
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => {
                                    const newColor = e.target.value;
                                    setSelectedColor(newColor);
                                    const canvas = fabricRef.current;
                                    const obj = canvas?.getActiveObject();
                                    if (!obj) return;

                                    if (obj.type === "i-text") {
                                        obj.set("fill", newColor);
                                    } else if (obj.type === "rect") {
                                        obj.set("stroke", newColor);
                                    } else if (obj.type === "group") {
                                        const line = obj.item(0);
                                        const arrow = obj.item(1);
                                        line.set("stroke", newColor);
                                        arrow.set("fill", newColor);
                                    }
                                    else if (obj.type === "circle") {
                                        obj.set("stroke", newColor); // ✅ เพิ่มตรงนี้
                                    }
                                    else if (obj.path && obj.path.length > 0) {
                                        obj.set("stroke", newColor);
                                    }
                                    canvas.requestRenderAll();
                                }}
                                className="w-10 h-10 border rounded"
                            />

                            {/* ขนาดฟอนต์ */}
                            <input
                                type="number"
                                min={8}
                                max={100}
                                value={fontSize}
                                onChange={(e) => {
                                    const newSize = parseInt(e.target.value);
                                    setFontSize(newSize);
                                    const canvas = fabricRef.current;
                                    const obj = canvas?.getActiveObject();
                                    if (obj?.type === "i-text") {
                                        obj.set("fontSize", newSize);
                                        canvas.requestRenderAll();
                                    }
                                }}
                                className="w-16 min-w-[40px] text-sm border rounded px-2 py-1"
                            />
                            <select
                                value={Math.round(zoomLevel * 100)}
                                onChange={(e) => {
                                    const newZoom = parseInt(e.target.value) / 100;
                                    setZoomLevel(newZoom);
                                }}
                                className="px-2 py-1 border rounded text-sm"
                            >
                                {[25, 50, 75, 100, 125, 150, 200].map((percent) => (
                                    <option key={percent} value={percent}>
                                        {percent}%
                                    </option>
                                ))}
                            </select>
                            {/* ปุ่ม: เพิ่มวงกลม */}
                            <button
                                onClick={addCircle}
                                className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                                title="เพิ่มวงกลม"
                            >
                                ⭕
                            </button>

                            {/* ปุ่ม: วาดอิสระ */}
                            <button
                                onClick={enableFreeDrawing}
                                className="p-2 rounded bg-indigo-500 text-white hover:bg-indigo-600"
                                title="วาดอิสระ"
                            >
                                ✏️
                            </button>
                            {/* ปุ่ม: เพิ่มข้อความ */}
                            <button
                                onClick={addText}
                                className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                                title="เพิ่มข้อความ"
                            >
                                💬
                            </button>

                            {/* ปุ่ม: เพิ่มกล่อง */}
                            <button
                                onClick={addBox}
                                className="p-2 rounded bg-yellow-500 text-white hover:bg-yellow-600"
                                title="เพิ่มกรอบ"
                            >
                                ⏹️
                            </button>

                            {/* ปุ่ม: เพิ่มลูกศร */}
                            <button
                                onClick={addArrow}
                                className="p-2 rounded bg-green-500 text-white hover:bg-green-600"
                                title="เพิ่มลูกศร"
                            >
                                ➡️
                            </button>
                            <button
                                onClick={addBlurRegion}
                                className="p-2 rounded bg-pink-500 text-white hover:bg-pink-600"
                                title="เบลอ"
                            >
                                🌫️
                            </button>

                            {/* ปุ่ม: ลบวัตถุที่เลือก */}
                            <button
                                onClick={() => {
                                    const canvas = fabricRef.current;
                                    if (canvas && canvas.getActiveObject()) {
                                        canvas.remove(canvas.getActiveObject());
                                        canvas.discardActiveObject();
                                        canvas.requestRenderAll();
                                    }
                                }}
                                className="p-2 rounded bg-gray-600 text-white hover:bg-gray-700"
                                title="ลบวัตถุ"
                            >
                                🗑️
                            </button>

                            {/* ปุ่ม: ล้างทั้งหมด */}
                            <button
                                onClick={() => {
                                    const canvas = fabricRef.current;
                                    if (!canvas) return;

                                    // ลบทุก object ยกเว้น backgroundImage
                                    canvas.getObjects().forEach((obj) => {
                                        canvas.remove(obj);
                                    });

                                    canvas.requestRenderAll();
                                }}
                                className="p-2 rounded bg-gray-400 text-white hover:bg-gray-500"
                                title="ลบทั้งหมด"
                            >
                                🧹
                            </button>
                        </div>

                        <div className="flex gap-2 mt-2 md:mt-0">
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                            >
                                📥
                                copy
                            </button>

                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                            >
                                💾
                                โหลด
                            </button>

                            <button
                                onClick={handleContinue}
                                className="px-4 py-2 rounded bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-1"
                            >
                                📩
                                ส่ง
                            </button>

                            <button
                                onClick={() => {
                                    resetScreenshotValue()
                                    setIsEditing(false)
                                }}
                                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                            >
                                ❌
                                ปิด
                            </button>
                        </div>

                    </div>

                    <div className="flex justify-center items-center w-full">
                        <canvas
                            id="screenshot-canvas"
                            className="border rounded shadow mx-auto max-w-full h-auto max-h-[80vh]"
                            width={canvasSize.width}
                            height={canvasSize.height}
                        />
                    </div>

                </div>
            )
            }

            {
                sidePanelOpen && (
                    <div className="fixed right-0 top-0 w-96 h-full bg-white p-4 shadow-lg z-[9999] overflow-y-auto text-black">
                        <h2 className="font-bold mb-2">📤 ส่งรูปพร้อมข้อมูล</h2>

                        {canvasUrl && (
                            <img
                                src={canvasUrl}
                                className="w-full mb-2 border rounded"
                                alt="screenshot preview"
                            />
                        )}

                        {/* 📝 title */}
                        <div className="mb-2">
                            <select
                                className="w-full border rounded p-2 mt-1"
                                value={screenshotValue.title}
                                onChange={(e) =>
                                    setscreenshotValue((prev) => ({ ...prev, title: e.target.value }))
                                }
                            >
                                <option value="">-- เลือกหัวข้อปัญหา --</option>
                                <option value="หน้าเว็บโหลดไม่ขึ้น">🌐 หน้าเว็บโหลดไม่ขึ้น</option>
                                <option value="หน้าเว็บค้างหรือไม่ตอบสนอง">🌀 หน้าเว็บค้าง / ไม่ตอบสนอง</option>
                                <option value="เกิด Error หรือแจ้งเตือนผิดปกติ">🚨 Error / แจ้งเตือนผิดปกติ</option>
                                <option value="ปุ่มหรือฟังก์ชันใช้งานไม่ได้">🔘 ปุ่มหรือฟังก์ชันกดไม่ได้</option>
                                <option value="กรอกข้อมูลแล้วไม่บันทึก">📥 กรอกข้อมูลแล้วไม่บันทึก</option>
                                <option value="แสดงผลไม่ถูกต้อง">📊 ข้อมูลแสดงผลผิด</option>
                                <option value="ปัญหาการเข้าสู่ระบบ">🔐 เข้าสู่ระบบไม่ได้</option>
                                <option value="โหลดข้อมูลช้า / Time out">🐢 โหลดข้อมูลช้า / Time out</option>
                                <option value="ระบบล่มทั้งหมด">💥 ระบบล่ม</option>
                                <option value="อื่น ๆ">✏️ อื่น ๆ (ระบุในรายละเอียด)</option>
                            </select>
                        </div>


                        {/* 📝 description */}
                        <textarea
                            placeholder="รายละเอียด (Description)"
                            className="w-full border rounded p-2 h-20 mb-2"
                            value={screenshotValue.description}
                            onChange={(e) =>
                                setscreenshotValue((prev) => ({ ...prev, description: e.target.value }))
                            }
                        />


                        {/* 🚨 ระดับความรุนแรง */}
                        <div className="mb-2">
                            <label className="block mb-1 font-medium">ระดับความรุนแรงของปัญหา</label>
                            <select
                                className="w-full border rounded p-2"
                                value={screenshotValue.priority}
                                onChange={(e) =>
                                    setscreenshotValue((prev) => ({ ...prev, priority: e.target.value }))
                                }
                            >
                                <option value="1 วิกฤติ">1 วิกฤติ</option>
                                <option value="2 สูง">2 สูง</option>
                                <option value="3 ปานกลาง">3 ปานกลาง</option>
                                <option value="4 ต่ำ">4 ต่ำ</option>
                            </select>
                        </div>
                        {/* 🚨 modules */}
                        <div className="mb-2">
                            <label className="block mb-1 font-medium">modules</label>
                            <select
                                className="w-full border rounded p-2"
                                value={screenshotValue.modules}
                                onChange={(e) =>
                                    setscreenshotValue((prev) => ({ ...prev, modules: e.target.value }))
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
                                value={screenshotValue.type}
                                onChange={(e) =>
                                    setscreenshotValue((prev) => ({ ...prev, type: e.target.value }))
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

                        {/* 🌐 URL */}
                        <input
                            type="text"
                            placeholder="URL ที่เกี่ยวข้อง"
                            className="w-full border rounded p-2 mb-2"
                            value={screenshotValue.url}
                            onChange={(e) =>
                                setscreenshotValue((prev) => ({ ...prev, url: e.target.value }))
                            }
                        />

                        {/* 👤 ผู้รายงาน */}
                        <input
                            type="text"
                            placeholder="ชื่อผู้รายงาน (Reporter)"
                            className="w-full border rounded p-2 mb-2"
                            value={screenshotValue.reporter}
                            onChange={(e) =>
                                setscreenshotValue((prev) => ({ ...prev, reporter: e.target.value }))
                            }
                        />

                        {/* ✏️ คอมเมนต์เพิ่มเติม */}
                        <textarea
                            placeholder="หมายเหตุเพิ่มเติม..."
                            className="w-full border rounded p-2 h-20 mb-2"
                            value={screenshotValue.comment}
                            onChange={(e) =>
                                setscreenshotValue((prev) => ({ ...prev, comment: e.target.value }))
                            }
                        />
                        {/* google drive sheet */}
                        {/* <button
                        disabled={isLoading}
                        className={`mt-2 px-4 py-2 rounded w-full text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        onClick={() => {
                            const payload = {
                                projectname: process.env.NEXT_PUBLIC_PROJECT_NAME,
                                title: screenshotValue.title,
                                description: screenshotValue.description,
                                module: window.location.href,
                                url: screenshotValue.url,
                                reporter: screenshotValue.reporter,
                                status: 'รอดำเนินการ',
                                createdat: new Date().toLocaleString(),
                                screenshotpath: canvasUrl,
                            };
                            handleSendData(payload);
                        }}
                    >
                        {isLoading ? '⏳ กำลังส่ง...' : '📩 ส่ง'}
                    </button> */}

                        <button
                            disabled={isLoading}
                            className={`mt-2 px-4 py-2 rounded w-full text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            onClick={() => {
                                const payload = {
                                    ...screenshotValue,
                                    module: window.location.href,
                                    screenshotpath: canvasUrl,
                                    bucode: bucode
                                };
                                console.log("📩 ส่งข้อมูล:", payload);
                                handleSendData(payload)
                                // setSidePanelOpen(false);
                            }}
                        >
                            {isLoading ? '⏳ กำลังส่ง...' : '📩 ส่ง'}
                        </button>

                        <button
                            className="mt-2 bg-red-600 text-white px-4 py-2 rounded w-full hover:bg-red-700"
                            onClick={() => {
                                resetScreenshotValue()
                                setSidePanelOpen(false);
                            }}
                        >
                            ❌ ปิด
                        </button>
                    </div>
                )
            }
            <style jsx>{`
   @media print {
  .no-print {
    display: none !important;
  }
   
}
      `}</style>
        </>
    );
}