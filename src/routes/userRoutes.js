import express from "express";
const router = express.Router();
import { registerUser, loginUser, getProfile, updateUser , logoutUser,  verifyTwoFactorCode, changePassword,
    getAllUsersWithClaims, getUserDetails} from "../controllers/userController.js";
import { forgotPassword, resetPassword } from "../utils/mail.js"; 
import authMiddleware from "../middleware/authMiddleware.js"
import adminMiddleware from "../middleware/adminMiddleware.js"

// Routes publiques
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify2fa", verifyTwoFactorCode);  // 2FA (authentification a 2 facteurs)
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword); 
// Routes protegees
router.get("/profile", authMiddleware, getProfile );
router.put("/profile/update",authMiddleware, updateUser);
router.put("/profile/changePassword", authMiddleware, changePassword);
router.post("/logout", authMiddleware, logoutUser);
router.get("/admin/allUsers", authMiddleware, adminMiddleware, getAllUsersWithClaims);
router.get("/admin/allUsers/:userId", authMiddleware, adminMiddleware, getUserDetails);

export default router;