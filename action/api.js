import { GET, POST, DELETE, PUT } from "@/components/apicomponent/api";

export const getmember = () => {
    return GET("/projectUser")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editmember = (id, data) => {
    return PUT("/projectUser/" + id, data)
}
export const addmember = (data) => {
    return POST("/projectUser", data)
}
export const deletemember = (id) => {
    return DELETE("/projectUser/"+id)
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
    return DELETE("/projectRole/"+id)
}
export const getproJects = () => {
    return GET("/projectTaskAssignment/grouped/getTaskAssignments")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editproject = (id, data) => {
    return PUT("/proJects/" + id, data) 
}
export const addproject = (data) => {
    return POST("/proJects", data)
}
export const deleteproject = (id) => {
    return DELETE("/proJects/"+id) 
}

export const edittask = (id, data) => {
    return PUT("/projectTask/" + id, data)
}
export const addtask = (data) => {
    return POST("/projectTask", data)
}
export const deletetask = (id) => {
    return DELETE("/projectTask/"+id) 
} 