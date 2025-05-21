import Notification from "../models/notificationsModel.js";

const sendNotification = async ({ userId, type, titre, message }) => {
    try {
        const notification = new Notification({
            userId,
            type,
            titre,
            message,
            lu: false,  // Assurez-vous que les nouvelles notifications sont non lues
        });
        await notification.save();
        console.log("✅ Notification envoyée:", notification);
        return true;
        } catch (error) {
        console.error("❌ Erreur envoi notification:", error);
        return false;
        }
};

export default sendNotification;

