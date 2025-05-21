import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
    getUserNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// only for user :
router.get("/", authMiddleware, getUserNotifications);
router.patch("/:id/lue", authMiddleware, markAsRead); //id de la notification et non pas user
router.patch("/markAllAsRead", authMiddleware, markAllAsRead);
/*PATCH donne une intention claire : "je modifie une partie de l'objet"
qui est dAans ce cas lue ou pas so je vais pas utilise put */
router.delete("/delete/:id", authMiddleware, deleteNotification);

export default router;
