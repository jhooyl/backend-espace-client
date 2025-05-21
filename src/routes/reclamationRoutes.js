import express from "express";
import { createReclamation, getAllReclamations, getUserReclamations, answerReclamation } from "../controllers/reclamationController.js";
import authMiddleware from "../middleware/authMiddleware.js"
import adminMiddleware from "../middleware/adminMiddleware.js"

const router = express.Router();

//user :
router.post("/", authMiddleware, createReclamation);
router.get("/allReclamations", authMiddleware, getUserReclamations);
//admin :
router.get("/", authMiddleware, adminMiddleware, getAllReclamations); 
router.put("/:reclamationId/answer", authMiddleware, adminMiddleware, answerReclamation); 

export default router;
