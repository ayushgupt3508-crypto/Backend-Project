import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler( async (req,res) => {
    
    //* take input of all fields from frontend
    //* validation --> not empty
    //* check if user already exists
    //* check for avatar and images 
    //* push them to cloudinary
    //* create user object and entry in db
    //* remove password and refresh token field from response 
    //* check for user creation
    //* return res

    const {fullname,email,username,password} = req.body
    console.log("email: ", email);

    if ([fullname,email,username,password].some( 
        (field) => field?.trim() === "") )
    {
        throw new ApiError(400, "All fields are required")     
    }
    if(!email.includes("@")){
        throw new Error("Email must contain @")
    }

    const existedUser = await User.findOne({email})
    if(existedUser){
        // throw new ApiError(409,"User already exists")
        res.status(400).json({
            message: "already exists"
        })
    }
    //else {
    //     res.json({message: "ok"})
    // }

    // console.log(req.files);
    
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPathLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPathLocalPath)
    
    if(!avatar){
        throw new ApiError(400,"Avatar image is required")
    }

    const user = await User.create({
        fullname,
        email,
        username: username.toLowercase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createduser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500), "Something went wrong while registering the user..."
    }

    return res.status(201).json(
        new ApiResponse(
            200,
            createduser,
            "User registered Successfully"
        )
    )

})

export {registerUser}