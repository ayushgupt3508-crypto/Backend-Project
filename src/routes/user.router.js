import express from 'express'
import {loginUser, registerUser , logOutUser} from '../controllers/user.controller.js'
import {upload} from '../middlewares/multer.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/loginUser").post(loginUser)

//* secured routes
router.route("logOutUser").post(verifyJWT , logOutUser)

export default router