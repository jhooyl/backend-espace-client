import Notification from "../models/notificationsModel.js";

//Créer une notification (à utiliser en interne dans les autres services)
export const createNotification = async (req, res) => {
    try {
        const { userId, type, titre, message } = req.body;

        const notification = new Notification({ userId, type, titre, message });
        await notification.save();

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la création de la notification" });
    }
    };

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("🔍 Recherche notifications pour userId:", userId);

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    console.log("📋 Notifications trouvées:", notifications.length);
    
    if (notifications.length === 0) {
      return res.status(200).json({
        success: true,  // Ajout de success:true pour cohérence
        message: "Aucune notification pour le moment. Profitez de votre journée ☀️"
      });
    }

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("❌ Erreur récupération notifications:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};


export const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif || notif.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Notification introuvable" });
    }

    notif.lu = true;
    await notif.save();
    res.status(200).json({ success: true, message: "Notification marquée comme lue" });
  } catch (error) {
    console.error("❌ Erreur marquage comme lue:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, lu: false },
      { $set: { lu: true } }
    );
    res.status(200).json({ success: true, message: "Toutes les notifications ont été marquées comme lues" });
  } catch (error) {
    console.error("❌ Erreur marquage toutes lues:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Supprimer une notification
export const deleteNotification = async (req, res) => {
    try {
        const notif = await Notification.findById(req.params.id);
        if (!notif || notif.userId.toString() !== req.user._id.toString()) {
        return res.status(404).json({ message: "Notification introuvable" });
        }

        await notif.deleteOne();
        res.json({ message: "Notification supprimée" });
    } catch (error) {
        res.status(500).json({ message: "Erreur" });
    }
    };
