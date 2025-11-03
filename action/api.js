import { GET, POST, DELETE, PUT, UPLOAD } from "@/components/apicomponent/api";

export const getmember = () => {
    return GET("/users/byprojectId/1")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const getmemberbyteam = (data) => {
    return GET("/team/" + data)
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editmember = (id, data) => {
    return PUT("/projectUser/" + id, data)
}
export const addmember = (data) => {
    return POST("/users/addMember", data)
}
export const addmemberteam = (data) => {
    return POST("/team/addMember", data)
}
export const createTeam = (data) => {
    return POST("/team", data)
}
export const deletemember = (id) => {
    return DELETE("/projectUser/" + id)
}
export const deletememberteam = (data) => {
    return POST("/team/removeMember", data)
}
export const getrole = () => {
    return GET("/projectRole")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editrole = (id, data) => {
    return PUT("/projectRole/" + id, data)
}
export const addrole = (data) => {
    return POST("/projectRole", data)
}
export const deleterole = (id) => {
    return DELETE("/projectRole/" + id)
}

export const getproJectsAll = () => {
    //return GET("/projectTaskAssignment/grouped/getTaskAssignments")
    return GET("/tm_project")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const getproJects = (id) => {
    //return GET("/projectTaskAssignment/grouped/getTaskAssignments")
    return GET("/tm_project/getbyOwnerId/" + id)
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const getTaskByProjectId = (id) => {
    //return GET("/projectTaskAssignment/grouped/getTaskAssignments")
    return GET("/tm_project/getTaskByProjectId/" + id)
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const getproJectsById = (id) => {
    //return GET("/projectTaskAssignment/grouped/getTaskAssignments")
    return GET("/tm_project/getbyProjectId/" + id)
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editproject = (id, data) => {
    return PUT("/tm_project/" + id, data)
}
export const addproject = (data) => {
    return POST("/tm_project", data)
}
export const deleteproject = (id) => {
    return DELETE("/tm_project/" + id)
}

export const edittask = (data) => {
    return PUT("/tm_project/update/Task", data)
}
export const addtask = (data) => {
    return POST("/projectTask", data)
}
export const createTask = (data) => {
    return POST("/tm_project/createTask", data)
}
export const deletetask = (id) => {
    return DELETE("/projectTask/" + id)
}
export const getbyProjectGattId = (id) => {
    return GET("/tm_project/getbyProjectGattId/" + id)
}
export const getbyProjectDashboad = (id) => {
    return GET("/tm_project/getbyProjectDashboad/" + id)
}
export async function registerApi(data) {
    return POST('/api/auth_web/register', data);
}

export async function loginApi(data) {
    return POST('/api/auth_web/login', data);
} 
// ยิงอัปโหลด และรีเทิร์นเฉพาะ URLs + ข้อมูลดิบ (message,data)
export async function uploadfile(files, { fields = {}, onProgress, signal } = {}) {
    // รองรับไฟล์เดียวหรือหลายไฟล์
    const arr = Array.isArray(files) ? files : (files ? [files] : []);
    if (arr.length === 0) {
        return { error: new Error('No files provided'), message: 'กรุณาเลือกไฟล์อย่างน้อยหนึ่งไฟล์' };
    }

    const resp = await UPLOAD('/uploads/multiple', {
        files: arr,
        fieldName: 'images',       // ตามสเปค API: คีย์เดียวชื่อ images ซ้ำๆ
        fields,
        onProgress,
        signal,
    });

    // ถ้า API ตอบ error ไว้ตามสัญญาเดิม
    if (!resp || resp.error) return resp;

    // ป้องกัน URL ซ้อน // เช่น .../api/v1//uploads/xxx.png
    const normalizeUrl = (u) => {
        try {
            // ตัดให้เหลือ scheme://host + path ที่ไม่มี // กลาง path
            const url = new URL(u);
            url.pathname = url.pathname.replace(/\/{2,}/g, '/');
            return url.toString();
        } catch {
            // ถ้าไม่ใช่ absolute URL ก็แก้เฉพาะ path
            return String(u || '').replace(/\/{2,}/g, '/');
        }
    };

    const rawItems = Array.isArray(resp?.data) ? resp.data : [];
    const urls = rawItems
        .map((it) => it?.url && normalizeUrl(it.url))
        .filter(Boolean);

    return {
        ok: true,
        message: resp?.message || 'Files uploaded',
        urls,        // 👉 ได้ลิสต์ URL พร้อมใช้งาน
        items: rawItems.map((it) => ({
            ...it,
            url: it?.url ? normalizeUrl(it.url) : it?.url,
        })), // เผื่ออยากได้ filename/originalname/size
    };
}



// ดึงโทเค็นจาก response ที่อาจใช้ชื่อแตกต่างกัน (token | accessToken | jwt | data.token)
export function extractToken(resp) {
    if (!resp) return null;
    return (
        resp.token ||
        resp.accessToken ||
        (resp.data && (resp.data.token || resp.data.accessToken)) ||
        null
    );
}