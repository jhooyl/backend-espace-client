import Abonnement from "../models/abonnementModel.js";
import Consommation from "../models/consommationModel.js"; 
import { updateVolumeConsomme } from "../utils/abonnementUtils.js";
import sendNotification from "../utils/sendNotification.js";

export const simulateConsommation = async (req, res) => {
    try {
        const user = req.user;

        const typeInput = req.query.type?.toLowerCase() || req.body.type?.toLowerCase();

        const typeMapping = {
            internet: "Internet",
            telephonie: "Téléphonie"
        };

        const typeAbonnement = typeMapping[typeInput];

        if (!typeAbonnement) {
            return res.status(400).json({
                message: "Type d'abonnement invalide. Utilisez ?type=internet ou ?type=telephonie"
            });
        }

        const abonnement = await Abonnement.findOne({
            userId: user._id,
            type: typeAbonnement,
            statut: { $in: ["Actif", "actif"] },
            dateExpiration: { $gte: new Date() }
        });

        if (!abonnement) {
            return res.status(404).json({ 
                message: `Aucun abonnement actif trouvé pour le type ${typeInput}` 
            });
        }

        if (abonnement.statut === "limite_atteinte") {
            return res.status(403).json({
                message: "La limite de consommation a été atteinte. Simulation non autorisée."
            });
        }

        // 🧮 Génération de la quantité simulée
        let quantite = typeInput === "internet"
            ? Math.floor(Math.random() * 300) + 1 // Mo
            : Math.floor(Math.random() * 60) + 1;  // minutes

        if (abonnement.volumeTotal !== "Illimité") {
            const volumeRestant = abonnement.volumeTotal - abonnement.volumeConsomme;

            if (volumeRestant <= 0) {
                return res.status(400).json({
                    message: "Le volume de l'abonnement est totalement consommé. Simulation impossible."
                });
            }

            // 🔁 Ajustement si dépassement
            if (quantite > volumeRestant) {
                console.log(`⚠️ Quantité ajustée de ${quantite} à ${volumeRestant} pour ne pas dépasser la limite.`);
                quantite = volumeRestant;
            }
        }

        // ✅ Sauvegarde de la consommation
        const consommation = new Consommation({
            userId: user._id,
            abonnementId: abonnement._id,
            type: typeInput,
            quantite,
        });

        await consommation.save();
        console.log("✅ Consommation enregistrée :", consommation);

        const abonnementUpdated = await updateVolumeConsomme(abonnement._id);

        if (abonnementUpdated && abonnementUpdated.statut === "limite_atteinte") {
            await sendNotification({
                userId: user._id,
                type: "warning",
                titre: "Limite de consommation atteinte",
                message: `Vous avez atteint la limite de consommation de votre abonnement ${typeInput}.`
            });

            return res.status(200).json({ 
                message: "Limite atteinte après cette consommation.",
                consommation 
            });
        }

        return res.status(200).json({ 
            message: `Consommation simulée avec succès pour ${typeInput}`,
            consommation 
        });

    } catch (error) {
        console.error("❌ Erreur simulateConsommation :", error);
        res.status(500).json({ message: "Erreur lors de la simulation de consommation" });
    }
};


export const getHistoriqueConsommation = async (req, res) => {
    try {
        const userId = req.user._id;
        const historique = await Consommation.find({ userId }).sort({ date: -1 });
        res.json(historique);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la récupération de l'historique" });
    }
};

export const checkConsommationStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const abonnement = await Abonnement.findOne({
            userId: userId,
            statut: { $in: ["Actif", "actif", "limite_atteinte"] }
        });
        
        if (!abonnement) {
            return res.status(404).json({ message: "Aucun abonnement actif trouvé" });
        }
        
        // Mettre à jour le calcul
        await updateVolumeConsomme(abonnement._id);
        
        // Calculer le pourcentage utilisé
        let pourcentageUtilise = 0;
        if (abonnement.volumeTotal && abonnement.volumeTotal !== "Illimité") {
            pourcentageUtilise = (abonnement.volumeConsomme / abonnement.volumeTotal) * 100;
        }
        
        // Générer des alertes
        let alerte = null;
        if (pourcentageUtilise >= 100) {
            alerte = "LIMITE_ATTEINTE";
        } else if (pourcentageUtilise >= 90) {
            alerte = "CRITIQUE";
        } else if (pourcentageUtilise >= 80) {
            alerte = "ATTENTION";
        }
        
        // Vérifier expiration proche
        const aujourdhui = new Date();
        const joursRestants = Math.ceil((abonnement.dateExpiration - aujourdhui) / (1000 * 60 * 60 * 24));
        
        let alerteExpiration = null;
        if (joursRestants <= 3) {
            alerteExpiration = "EXPIRATION_IMMINENTE";
        }
        
        res.json({
            statut: abonnement.statut,
            volumeTotal: abonnement.volumeTotal,
            volumeConsomme: abonnement.volumeConsomme,
            pourcentageUtilise: pourcentageUtilise.toFixed(2),
            dateExpiration: abonnement.dateExpiration,
            joursRestants,
            alerte,
            alerteExpiration
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur lors de la vérification" });
    }
};