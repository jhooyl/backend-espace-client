import express from "express";
import {
    getUserFactures,
    getFactureById,
    generateFacturePDF,
    payerFacture,
    getAllFactures,
    getFactureStatistics
} from "../controllers/factureController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

// admin :
router.get("/admin", authMiddleware, adminMiddleware, getAllFactures);
router.get("/admin/statistiques",authMiddleware, adminMiddleware, getFactureStatistics);

// user :
router.get("/mesFactures", authMiddleware, getUserFactures);
router.get("/:factureId", authMiddleware, getFactureById);
router.get("/:factureId/pdf", authMiddleware, generateFacturePDF);
router.post("/:factureId/paiement", authMiddleware, payerFacture);

export default router;
