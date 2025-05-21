import Abonnement from "../models/abonnementModel.js";
import User from "../models/userModel.js";
import { offresAbonnement } from "../config/offres.js";
import HistoriqueAbonnement from "../models/historiqueAbonnementModel.js";
import sendNotification from "../utils/sendNotification.js";

const ERROR_MESSAGES = {
    NOT_FOUND: "Abonnement non trouvé",
    UNAUTHORIZED: "Action non autorisée",
    INVALID_DATA: "Données d'abonnement invalides",
    SERVER_ERROR: "Erreur serveur"
};

export const getAbonnement = async (req, res) => {
    try {
        const userId = req.user._id;
        const abonnement = await Abonnement.findOne({ userId }).populate("userId", "nom email");
        if (!abonnement) {
            return res.status(404).json({ success: false, message: ERROR_MESSAGES.NOT_FOUND, code: "SUBSCRIPTION_NOT_FOUND" });
        }
        res.json({ success: true, data: abonnement });
    } catch (error) {
        console.error("Erreur getAbonnement:", error);
        res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR, code: "SERVER_ERROR" });
    }
};

export const chooseOffre = async (req, res) => {
    try {
        const userId = req.user._id;
        const { categorie, offreGlobale, offreSpecifique } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé", code: "USER_NOT_FOUND" });
        }

        const clientType = user.clientType?.toLowerCase();
        const categorieLower = categorie?.toLowerCase();
        const typeMapping = {
            internet: "Internet",
            telephonie: "Téléphonie"
        };
        const typeFinal = typeMapping[categorieLower];
        if (!typeFinal) {
            return res.status(400).json({ success: false, message: "Type d'abonnement invalide", code: "INVALID_TYPE" });
        }

        if (!categorieLower || !offresAbonnement[clientType]?.[categorieLower]) {
            return res.status(400).json({ success: false, message: "Catégorie invalide", code: "INVALID_CATEGORY" });
        }

        const existingInternet = await Abonnement.findOne({ userId, type: "Internet", statut: "Actif" });
        if (categorieLower === "internet" && existingInternet) {
            return res.status(400).json({
                success: false,
                message: "L'utilisateur a déjà un abonnement Internet actif",
                abonnement: existingInternet,
                code: "INTERNET_ALREADY_ACTIVE"
            });
        }

        const offresCategorie = offresAbonnement[clientType][categorieLower];
        if (!offresCategorie[offreGlobale]) {
            return res.status(400).json({ success: false, message: "Offre globale non disponible", code: "GLOBAL_OFFER_NOT_AVAILABLE" });
        }

        const offreDisponible = offresCategorie[offreGlobale].find(offre => offre.offre === offreSpecifique);
        if (!offreDisponible) {
            return res.status(400).json({ success: false, message: "Offre spécifique non disponible", code: "SPECIFIC_OFFER_NOT_AVAILABLE" });
        }

        const dateExpiration = new Date();
        const match = offreDisponible.duree.match(/(\d+)\s*(mois|jours)/i);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            if (unit === "mois") dateExpiration.setMonth(dateExpiration.getMonth() + value);
            else if (unit === "jours") dateExpiration.setDate(dateExpiration.getDate() + value);
        } else {
            console.warn("Format de durée inattendu:", offreDisponible.duree);
        }

        let volumeTotal;
        if (offreDisponible.volumeTotal === "Illimité") {
            volumeTotal = "Illimité";
        } else {
            const volumeMatch = offreDisponible.volumeTotal.match(/(\d+)\s*(Go|GO|Mo|MO|minutes)/i);
            if (volumeMatch) {
                const value = parseInt(volumeMatch[1]);
                const unit = volumeMatch[2].toLowerCase();
                volumeTotal = (unit === "go") ? value * 1024 : value;
            } else {
                volumeTotal = null;
            }
        }

        const newAbonnement = new Abonnement({
            userId,
            categorie: user.clientType.charAt(0).toUpperCase() + user.clientType.slice(1),
            type: typeFinal,
            //categorieLower.charAt(0).toUpperCase() + categorieLower.slice(1),
            offre: offreGlobale,
            debitOuVolume: offreSpecifique,
            prix: offreDisponible.prix,
            duree: offreDisponible.duree,
            dateDebut: new Date(),
            dateExpiration,
            statut: "Actif",
            volumeTotal: volumeTotal,
            volumeConsomme: 0,
            dernierReset: new Date(),
            cycleFacturation: "mensuel"
        });

        await newAbonnement.save();

        await sendNotification({
            userId,
            type: "success",
            titre: "Nouvel abonnement",
            message: `Félicitations ! Votre abonnement ${offreGlobale} ${offreSpecifique} a été activé avec succès.`
        });

        res.status(201).json({ success: true, message: "Abonnement créé avec succès", data: newAbonnement });

    } catch (error) {
        console.error("Erreur chooseOffre:", error);
        res.status(500).json({ success: false, message: "Erreur serveur", code: "SERVER_ERROR" });
    }
};



export const deleteAbonnement = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: ERROR_MESSAGES.UNAUTHORIZED, code: "ADMIN_REQUIRED" });
        }

        const userId = req.user._id;
        const abonnement = await Abonnement.findOne({ userId });
        if (!abonnement) {
            return res.status(404).json({ success: false, message: ERROR_MESSAGES.NOT_FOUND, code: "SUBSCRIPTION_NOT_FOUND" });
        }

        await abonnement.deleteOne();
        res.json({ success: true, message: "Abonnement supprimé avec succès" });
    } catch (error) {
        console.error("Erreur deleteAbonnement:", error);
        res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR, code: "SERVER_ERROR" });
    }
};

export const getOffresDisponibles = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé", code: "USER_NOT_FOUND" });
        }

        const clientType = user.clientType?.toLowerCase();
        if (!clientType || !offresAbonnement[clientType]) {
            return res.status(400).json({ success: false, message: "Catégorie invalide", code: "INVALID_CATEGORY" });
        }

        res.json({ success: true, offres: offresAbonnement[clientType] });
    } catch (error) {
        console.error("Erreur getOffresDisponibles:", error);
        res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR, code: "SERVER_ERROR" });
    }
};

export const createAbonnement = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: ERROR_MESSAGES.UNAUTHORIZED, code: "ADMIN_REQUIRED" });
        }

        const { userId, type, debit, validite, options } = req.body;
        if (!userId || !type || !debit || !validite) {
            return res.status(400).json({ success: false, message: ERROR_MESSAGES.INVALID_DATA, code: "MISSING_FIELDS" });
        }

        const existing = await Abonnement.findOne({ userId });
        if (existing) {
            return res.status(400).json({ success: false, message: "L'utilisateur a déjà un abonnement", code: "DUPLICATE_SUBSCRIPTION" });
        }

        const newAbonnement = new Abonnement({ userId, type, debit, validite, options: options || [] });
        await newAbonnement.save();

        res.status(201).json({ success: true, message: "Abonnement créé avec succès", data: newAbonnement });
    } catch (error) {
        console.error("Erreur createAbonnement:", error);
        res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR, code: "SERVER_ERROR" });
    }
};

export const updateAbonnement = async (req, res) => {
    try {
        const userId = req.user._id;
        const { type, offre, debitOuVolume, prix, duree, statut, options } = req.body;

        let abonnement = await Abonnement.findOne({ userId });
        if (!abonnement) {
            return res.status(404).json({ success: false, message: ERROR_MESSAGES.NOT_FOUND, code: "SUBSCRIPTION_NOT_FOUND" });
        }

        if (req.user._id.toString() !== abonnement.userId.toString() && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: ERROR_MESSAGES.UNAUTHORIZED, code: "UNAUTHORIZED_ACCESS" });
        }

        if (statut && statut !== abonnement.statut && (statut === "Suspendu" || statut === "Annulé")) {
            const historiqueEntry = new HistoriqueAbonnement({
                userId: abonnement.userId,
                abonnementId: abonnement._id,
                categorie: abonnement.categorie,
                type: abonnement.type,
                offre: abonnement.offre,
                debitOuVolume: abonnement.debitOuVolume,
                prix: abonnement.prix,
                duree: abonnement.duree,
                dateDebut: abonnement.dateDebut,
                dateExpiration: abonnement.dateExpiration,
                statut: statut === "Suspendu" ? "En cours" : "Annulé",
                options: abonnement.options
            });
            await historiqueEntry.save();
        }

        const updates = {};
        if (type !== undefined) updates.type = type;
        if (offre !== undefined) updates.offre = offre;
        if (debitOuVolume !== undefined) updates.debitOuVolume = debitOuVolume;
        if (prix !== undefined) updates.prix = prix;
        if (duree !== undefined) {
            updates.duree = duree;
            const dateExpiration = new Date(abonnement.dateDebut);
            if (duree.includes("mois")) dateExpiration.setMonth(dateExpiration.getMonth() + parseInt(duree));
            else if (duree.includes("jours")) dateExpiration.setDate(dateExpiration.getDate() + parseInt(duree));
            updates.dateExpiration = dateExpiration;
        }
        if (statut !== undefined) updates.statut = statut;
        if (options !== undefined) updates.options = { ...abonnement.options, ...options };

        const updatedAbonnement = await Abonnement.findOneAndUpdate(
            { userId },
            { $set: updates },
            { new: true }
        );

        res.json({ success: true, message: "Abonnement mis à jour avec succès", data: updatedAbonnement });
    } catch (error) {
        console.error("Erreur updateAbonnement:", error);
        res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR, code: "SERVER_ERROR" });
    }
};

export const getHistoriqueAbonnements = async (req, res) => {
    try {
        const userId = req.user._id;

        const historique = await HistoriqueAbonnement.find({ userId }).sort({ dateCreation: -1 }).populate("userId", "nom email");
        const abonnementsActifs = await Abonnement.find({ userId }).populate("userId", "nom email");

        const abonnementsActifsFormatted = abonnementsActifs.map(abo => ({
            _id: `actif_${abo._id}`,
            userId: abo.userId,
            abonnementId: abo._id,
            categorie: abo.categorie,
            type: abo.type,
            offre: abo.offre,
            debitOuVolume: abo.debitOuVolume,
            prix: abo.prix,
            duree: abo.duree,
            dateDebut: abo.dateDebut,
            dateExpiration: abo.dateExpiration,
            statut: "En cours",
            options: abo.options,
            dateCreation: abo.dateDebut,
            isActive: true
        }));

        const historiqueComplet = [...abonnementsActifsFormatted, ...historique];
        historiqueComplet.sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));

        res.json({ success: true, data: historiqueComplet });
    } catch (error) {
        console.error("Erreur getHistoriqueAbonnements:", error);
        res.status(500).json({ success: false, message: ERROR_MESSAGES.SERVER_ERROR, code: "SERVER_ERROR" });
    }
};
