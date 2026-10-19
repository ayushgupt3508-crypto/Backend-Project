import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
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
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(
        new ApiResponse(
            201,
            {},
            "User logged Out"
        )
    )
})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "Refresh token is required")
    }
    
    let decodedToken
    try {
        decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            throw new ApiError(401, "Invalid or expired refresh token")
        }
        throw error
    }

    const user = await User.findById(decodedToken._id)

    if(!user){
        throw new ApiError(401,"Unauthorized access")
    }

    if(incomingRefreshToken !== user.refreshToken){
        throw new ApiError(401,"Invalid refresh token - does not match")
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(200,
            {
                accessToken,
                refreshToken
            },
            "Access token refreshed"
        )
    )
})

const updatePassword = asyncHandler( async (req, res) => {
    try {
        const {oldPassword, newPassword} = req.body
    
        if(!oldPassword || !newPassword) {
            throw new ApiError(401, "Password is required")
        }
    
        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isCorrectPassword(oldPassword)
    
        if(!isPasswordCorrect) {
            throw new ApiError(402, "Old Password is not correct")
        }
    
        user.password = newPassword
        user.save({validateBeforeSave: false})
    
        return res
        .status(200).
        json(
            new ApiResponse(201, user, "Password updated successfully")
        )
    } catch (error) {
        new ApiResponse(500,{},"Error occured while updating the password")
    }
})

const getCurrentUser = asyncHandler( async (req,res) => {
    return res
    .status(200)
    .json(201, req.user, "Current User fetched successfully")
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    try {
        const {fullname, email} = req.body
        if(!fullname || !email) {
            throw new ApiError(401, "Fullname and email are required")
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set : {email, fullname}
            },
            {new : true}
        ).select("-password")

        return res
        .status(200)
        .json(
            201,
            user,
            "Account details updated successfully"
        )

    } catch (error) {
        throw new ApiError(500,"Error occured while updating account details")
    }
})

const updateUserAvatar = asyncHandler( async (req,res) => {
    try {
        const avatarLocalPath = req.file?.path
    
        if (!avatarLocalPath) {
            throw new ApiError(401,"avatar file not found")
        }
    
        const avatar = await uploadOnCloudinary(avatarLocalPath)
    
        if(!avatar.url){
            throw new ApiError(401,"Error occured while uploading on cloudinary")
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: avatar.url
                }
            },
            {new : true}
        ).select("-password")
    
        return res
        .status(200)
        .json(
            new ApiResponse(201,user,"Updated user avatar successfully")
        )
    } catch (error) {
        throw new ApiError(500,"Error occured while updating user avatar")
    }
})

const updateUserCoverImage = asyncHandler( async (req,res) => {
    try {
        const coverImageLocalPath = req.file?.path
    
        if (!coverImageLocalPath) {
            throw new ApiError(401,"coverImage file not found")
        }
    
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
        if(!coverImage.url){
            throw new ApiError(401,"Error occured while uploading on cloudinary")
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverImage.url
                }
            },
            {new : true}
        ).select("-password")
    
        return res
        .status(200)
        .json(
            new ApiResponse(201,user,"Updated user coverImage successfully")
        )
    } catch (error) {
        throw new ApiError(500,"Error occured while updating user coverImage")
    }
})

const getUserChannelProfile = asyncHandler( async (req,res) => {
    const {username} = req.params

    if (!username) {
        throw new ApiError(400, "Username is required")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowercase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [ req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                username: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            channel[0],
            "Channel fetched successfully"
        )
    )
})

export {registerUser, 
    loginUser, 
    logOutUser, 
    refreshAccessToken, 
    updatePassword, 
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}