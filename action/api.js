import { GET, POST, DELETE, PUT } from "@/components/apicomponent/api";

export const getmember = () => {
    return GET("/users/byprojectId/1")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const getmemberbyteam = (data) => {
    return GET("/team/"+data)
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
    return PUT("/tm_project/update/Task" , data)
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

export async function registerApi({ username, password, email }) {
    return POST('/api/auth_web/register', { username, password, email });
}

export async function loginApi({ username, password }) {
    return POST('/api/auth_web/login', { username, password });
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