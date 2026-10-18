import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = User.findById(userId)
        const accessToken = await user.generateAccessToken() 
        const refreshToken = await user.generateRefreshToken() 

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave : false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }
}

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

    if ([fullname, email, username, password].some(
        (field) => typeof field !== "string" || field.trim() === ""
    ))
    {
        throw new ApiError(400, "All fields are required")     
    }
    if(!email.includes("@")){
        throw new Error("Email must contain @")
    }

    const existedUser = await User.findOne({
        $or : [{email}, {username}]
    })
    if(existedUser){
        throw new ApiError(409, "User with this email or username already exists")
    }
    //else {
    //     res.json({message: "ok"})
    // }

    // console.log(req.files);
    
    const avatarLocalPath = req.files?.avatar[0]?.path
   // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage &&
         req.files.coverImage.length > 0)){
            coverImageLocalPath = req.files.coverImage[0].path
    }
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400,"Avatar image is required")
    }

    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    //* remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500), "Something went wrong while registering the user..."
    }

    return res.status(201).json(
        new ApiResponse(
            200,
            createdUser,
            "User registered Successfully"
        )
    )

})

const loginUser = asyncHandler( async (req,res) => {

    //* get data from req.body
    //* check for empty credentials
    //* find user in db
    //* validate password
    //* generate accessToken and refreshToken and save refreshToken in db
    //* send cookie

    const {email, username, password} = req.body

    if(!email && !username){
        throw new ApiError(401, "email or username is required")
    }

    const user = await User.findOne({
        $or : [{email}, {username}]
    })

    if(!user) {
        throw new ApiError(404, "User not registered")
    }

    const passwordValidation = await user.isCorrectPassword(password)

    if(!passwordValidation){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure: true
    }

    res.status(200)
    .cookie("accessToken" , accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            201,
            {user: loggedInUser, accessToken, refreshToken},
            "User logged in successfully"
        )
    )
})

const logOutUser = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken : undefined
            }
        }
    )

    const option = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .clearCookies("accessToken", option)
    .clearCookies("refreshToken", option)
    .json(
        new ApiResponse(
            201,
            {},
            "User logged Out"
        )
    )
})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required")
    }
    
    try {
        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        if(!decodedToken){
            throw new ApiError(402,"Invalid refresh token")
        }
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Unauthorized access")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(402,"Invalid refresh token - does not match")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
            const option = {
            httpOnly: true,
            secure: true
        }
    
        res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", newRefreshToken, option)
        .json(
            new ApiResponse(201,
                {
                    accessToken,refreshToken: newRefreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,"Invalid token")
    }
})
export {registerUser, loginUser, logOutUser, refreshAccessToken}