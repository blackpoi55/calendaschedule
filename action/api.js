import { GET, POST, DELETE, PUT } from "@/components/apicomponent/api";

export const getproJects = () => {
    return GET("/equipments/booking/projectTaskAssignment/grouped/getTaskAssignments")
}
export const editproject = (id, data) => {
    // return PUT("api" + id, data)
    console.log("editproject",data)
}
export const addproject = (data) => {
    // return POST("api", data)
     console.log("addproject",data)
} 
export const deleteproject = (id) => {
    // return DELETE("api"+id)
     console.log("deleteproject",id)
} 

export const edittask = (id, data) => {
    // return PUT("api" + id, data)
    console.log("edittask",data)
}
export const addtask = (data) => {
    // return POST("api", data)
     console.log("addtask",data)
} 
export const deletetask = (id) => {
    // return DELETE("api"+id)
     console.log("deletetask",id)
} 