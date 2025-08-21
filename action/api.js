import { GET, POST, DELETE, PUT } from "@/components/apicomponent/api";

export const getmember = () => {
    return GET("/equipments/booking/projectUser")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editmember = (id, data) => {
    return PUT("/equipments/booking/projectUser/" + id, data)
}
export const addmember = (data) => {
    return POST("/equipments/booking/projectUser", data)
}
export const deletemember = (id) => {
    return DELETE("/equipments/booking/projectUser/"+id)
}
export const getrole = () => {
    return GET("/equipments/booking/projectRole")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editrole = (id, data) => {
    return PUT("/equipments/booking/projectRole/" + id, data)
}
export const addrole = (data) => {
    return POST("/equipments/booking/projectRole", data)
}
export const deleterole = (id) => {
    return DELETE("/equipments/booking/projectRole/"+id)
}
export const getproJects = () => {
    return GET("/equipments/booking/projectTaskAssignment/grouped/getTaskAssignments")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editproject = (id, data) => {
    return PUT("/equipments/booking/proJects/" + id, data) 
}
export const addproject = (data) => {
    return POST("/equipments/booking/proJects", data)
}
export const deleteproject = (id) => {
    return DELETE("/equipments/booking/proJects/"+id) 
}

export const edittask = (id, data) => {
    return PUT("/equipments/booking/projectTask/" + id, data)
}
export const addtask = (data) => {
    return POST("/equipments/booking/projectTask", data)
}
export const deletetask = (id) => {
    return DELETE("/equipments/booking/projectTask/"+id) 
} 