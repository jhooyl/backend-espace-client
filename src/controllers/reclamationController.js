import Reclamation from "../models/reclamationModel.js";
import User from "../models/userModel.js";

// ➤ 1. Créer une nouvelle réclamation
export const createReclamation = async (req, res) => {
    try {
        if (req.user.role === "admin") {
            return res.status(403).json({ success: false, message: "Les administrateurs ne peuvent pas créer de réclamations." });
        }

        const { sujet, message } = req.body;
        const userId = req.user._id; // ✅ Correction ici

        const nouvelleReclamation = new Reclamation({
            user: userId,
            sujet,
            message
        });

        await nouvelleReclamation.save();
        await User.findByIdAndUpdate(userId, { $push: { reclamations: nouvelleReclamation._id } });

        res.status(201).json({ success: true, message: "Réclamation envoyée avec succès." });
    } catch (error) {
        console.error("Erreur création réclamation :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};


// ➤ 2. Récupérer toutes les réclamations (Admin)
export const getAllReclamations = async (req, res) => {
    try {
        const reclamations = await Reclamation.find().populate("user", "username email");
        res.json({ success: true, reclamations });
    } catch (error) {
        console.error("Erreur récupération réclamations :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ➤ 3. Récupérer les réclamations d'un utilisateur
export const getUserReclamations = async (req, res) => {
    try {
        const userId = req.user._id; // ✅ Correction ici
        const reclamations = await Reclamation.find({ user: userId });
        res.json({ success: true, reclamations });
    } catch (error) {
        console.error("Erreur récupération réclamations utilisateur :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};

// ➤ 4. Répondre à une réclamation et changer son statut (Admin)
export const answerReclamation = async (req, res) => {
    try {
        const { reclamationId } = req.params;
        const { reponse, statut } = req.body;
        const adminId = req.user._id; // ✅ Correction ici

        // Vérifier si le statut est valide
        if (!["traité"].includes(statut)) {
            return res.status(400).json({ success: false, message: "Statut invalide." });
        }

        // Vérifier si l'admin existe
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== "admin") {
            return res.status(403).json({ success: false, message: "Accès refusé." });
        }

        // Mettre à jour la réclamation avec une date de réponse
        const reclamation = await Reclamation.findByIdAndUpdate(
            reclamationId,
            { reponse, statut, admin: adminId, dateReponse: new Date() },
            { new: true }
        );

        if (!reclamation) {
            return res.status(404).json({ success: false, message: "Réclamation introuvable." });
        }

        res.json({ success: true, message: "Réclamation mise à jour avec succès.", reclamation });
    } catch (error) {
        console.error("Erreur mise à jour réclamation :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
};
