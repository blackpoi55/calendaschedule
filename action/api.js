import { GET, POST, DELETE, PUT } from "@/components/apicomponent/api";

export const getproJects = () => {
    return GET("/equipments/booking/projectTaskAssignment/grouped/getTaskAssignments")
    //เส้นนี้ขอ id ในส่นของ task เพิ่มมา ที details แต่ละ array
}
export const editproject = (id, data) => {
    // return PUT("api" + id, data)
    console.log("editproject", data)
    //เดี๋ยวส่ง id ของ project ที่ url ให้
    let body = {
        "name": "editproject page1",
        "team": "ทีม A",
        "startDate": "2025-08-07",
        "endDate": "2025-08-14",
        "totalDays": 8
    }
}
export const addproject = (data) => {
    // return POST("api", data)
    console.log("addproject", data)
    let body = {
        "name": "addproject page1",
        "team": "ทีม A",
        "startDate": "2025-08-07",
        "endDate": "2025-08-14",
        "totalDays": 8
    }
}
export const deleteproject = (id) => {
    // return DELETE("api"+id)
    console.log("deleteproject", id)
    //เดี๋ยวส่ง id ของ project ที่ url ให้
}

export const edittask = (id, data) => {
    // return PUT("api" + id, data)
    console.log("edittask", data)
    //เดี๋ยวส่ง id ของ task ที่ url ให้
    let body = {
        "role": "SA",
        "days": 15,
        "start": "2025-08-01",
        "end": "2025-08-15",
        "member": [
            "สมหญิง"
        ],
        "remark": ""
    }
}
export const addtask = (data) => {
    // return POST("api", data)
    console.log("addtask", data)
    let body = {
        "role": "SA",
        "days": 15,
        "start": "2025-08-01",
        "end": "2025-08-15",
        "member": [
            "สมหญิง"
        ],
        "remark": ""
    }
}
export const deletetask = (id) => {
    // return DELETE("api"+id)
    console.log("deletetask", id)
    //เดี๋ยวส่ง id ของ tsask ที่ url ให้
} 