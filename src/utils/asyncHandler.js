// There are two ways to write asynchandler function.

// 1. using try catch
// 2. using promises.

// in this one we are going to use promise

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch(
            (err) => next(err)
        )
    }
}

export {asyncHandler}



// const asynchander = () => {}  
// const asynchander = (func) => () => {}  
// const asynchander = (func) => async () => {}

    // the function below is summarizely written. opar wali 
// const asynchander = (func) => async (req, res, next) => {
//     try {
//         await func(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             error: err.message
//         })
//     }
// }  



