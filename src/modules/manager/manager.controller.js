

const getAllDepartments = async(req, res)=>{
    try {
        const user = req.user;
        if(user.role !== "manager") return res
    } catch (error) {
        
    }
}