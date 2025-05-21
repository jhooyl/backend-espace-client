import express from "express";
import { simulateConsommation, getHistoriqueConsommation } from "../controllers/consommationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/simuler", authMiddleware, simulateConsommation); 
router.get("/historique", authMiddleware, getHistoriqueConsommation);

export default router;
