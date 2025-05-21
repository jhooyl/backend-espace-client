import express from "express";
import {
    createAbonnement,
    getOffresDisponibles,
    chooseOffre,
    getAbonnement,
    getHistoriqueAbonnements,
    updateAbonnement,
    deleteAbonnement
} from "../controllers/abonnementController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();
//pour user : client
router.get("/offres", authMiddleware, getOffresDisponibles);
router.post("/choisir", authMiddleware, chooseOffre);
router.get("/:userId", authMiddleware, getAbonnement);
router.put("/:userId", authMiddleware, updateAbonnement); //je l'ai pas essayer 
router.get("/historique/:userId", authMiddleware, getHistoriqueAbonnements);
//pour admin --> (faut que je vois si ca marche)
router.post("/", authMiddleware, adminMiddleware, createAbonnement);
router.delete("/:userId", authMiddleware, adminMiddleware, deleteAbonnement);

export default router;
