const asyncHandler = (requesthandler) => {
    return (req,res,next) => {
        Promise.resolve(requesthandler(req,res,next))
        .catch( (err) => 
            next(err)
        );
    }
}

export {asyncHandler}

/* 
const asyncHandler = (requestHandler) = async (req,res,next) => {
        try(
            await requestHandler(req,res,next);
        )
        .catch(err) {
            res.status (err.code || 500).json(
                success: false,
                message: "Internal Server error!"
            )
        }
    }

*/