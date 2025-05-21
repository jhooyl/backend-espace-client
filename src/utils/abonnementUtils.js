import Consommation from '../models/consommationModel.js';
import Abonnement from '../models/abonnementModel.js';
import sendNotification from "../utils/sendNotification.js";

// Calcule et met a jour le total consomme pour un abonnement
// Dans abonnementUtils.js
export const updateVolumeConsomme = async (abonnementId) => {
    try {
        const abonnement = await Abonnement.findById(abonnementId);
        if (!abonnement) return null;
    
        // Calculer le volume total consommé
        const consommations = await Consommation.find({ abonnementId });
        let totalConsomme = consommations.reduce((acc, curr) => acc + curr.quantite, 0);
    
        // Important: Si le volume total n'est pas "Illimité", limiter totalConsomme au volumeTotal
        if (abonnement.volumeTotal !== "Illimité" && 
            typeof abonnement.volumeTotal === 'number' && 
            totalConsomme > abonnement.volumeTotal) {
            totalConsomme = abonnement.volumeTotal;
        }
    
        // Mettre à jour l'abonnement
        const statut = (abonnement.volumeTotal !== "Illimité" && 
                        totalConsomme >= abonnement.volumeTotal) 
                        ? "limite_atteinte" 
                        : "Actif";
    
        const updated = await Abonnement.findByIdAndUpdate(
            abonnementId,
            { 
            volumeConsomme: totalConsomme,
            statut 
            },
            { new: true }
        );
    
        // Si le statut change à "limite_atteinte", envoyer une notification
        if (statut === "limite_atteinte" && abonnement.statut !== "limite_atteinte") {
            await sendNotification({
            userId: abonnement.userId,
            type: "warning",
            titre: "Limite de consommation atteinte",
            message: `Vous avez atteint la limite de consommation de votre abonnement ${abonnement.type}.`
            });
        }
    
        return updated;
        } catch (error) {
        console.error("Erreur mise à jour volume consommé:", error);
        return null;
        }
    };

// Réinitialiser les compteurs selon le cycle de facturation
export const resetCompteursSiNecessaire = async () => {
    const now = new Date();
    
    // Trouver les abonnements à réinitialiser
    const abonnements = await Abonnement.find({
        statut: { $in: ["Actif", "actif", "limite_atteinte"] },
        dateExpiration: { $gt: now }
    });
    
    for (const abonnement of abonnements) {
        let doitReset = false;
        const dernierReset = new Date(abonnement.dernierReset);
        
        switch (abonnement.cycleFacturation) {
            case "mensuel":
                // Réinitialiser si on est dans un nouveau mois
                doitReset = dernierReset.getMonth() !== now.getMonth() || 
                            dernierReset.getFullYear() !== now.getFullYear();
                break;
            case "hebdomadaire":
                // Calculer la différence en jours
                const diffTemps = now.getTime() - dernierReset.getTime();
                const diffJours = Math.floor(diffTemps / (1000 * 60 * 60 * 24));
                doitReset = diffJours >= 7;
                break;
            case "quotidien":
                // Réinitialiser si on est un nouveau jour
                doitReset = dernierReset.getDate() !== now.getDate() ||
                        dernierReset.getMonth() !== now.getMonth() ||
                        dernierReset.getFullYear() !== now.getFullYear();
                break;
        }
        
        if (doitReset) {
            abonnement.volumeConsomme = 0;
            abonnement.dernierReset = now;
            if (abonnement.statut === "limite_atteinte") {
                abonnement.statut = "Actif";
            }
            await abonnement.save();
            console.log(`🔄 Compteurs réinitialisés pour abonnement ${abonnement._id}`);

            await sendNotification({
                userId: abonnement.userId,
                type: "info",
                titre: "Cycle de facturation renouvelé",
                message: "Votre consommation a été remise à zéro. Bon surf ! 🏄‍♂️"
            });
        }
    }
};

export const checkConsommationThresholds = async () => {
    try {
        // Trouver les abonnements actifs avec volumeTotal numérique
        const abonnements = await Abonnement.find({
            statut: "Actif",
            volumeTotal: { $ne: "Illimité" }
        });
        
        let notificationsEnvoyees = 0;
        
        for (const abonnement of abonnements) {
            // Ignorer si ce n'est pas un nombre
            if (typeof abonnement.volumeTotal !== 'number') continue;
            
            const pourcentageUtilise = (abonnement.volumeConsomme / abonnement.volumeTotal) * 100;
            
            // Notification à 90%
            if (pourcentageUtilise >= 90 && pourcentageUtilise < 100) {
                // Vérifier si une notification a déjà été envoyée dans les dernières 24h
                const derniere24h = new Date();
                derniere24h.setHours(derniere24h.getHours() - 24);
                
                const notificationRecente = await Notification.findOne({
                    userId: abonnement.userId,
                    type: "warning",
                    titre: "Consommation élevée",
                    createdAt: { $gt: derniere24h }
                });
                
                if (!notificationRecente) {
                    await sendNotification({
                        userId: abonnement.userId,
                        type: "warning",
                        titre: "Consommation élevée",
                        message: `Vous avez consommé plus de 90% de votre forfait ${abonnement.type}. Pensez à surveiller votre consommation.`
                    });
                    notificationsEnvoyees++;
                }
            }
        }
        
        return {
            success: true,
            notificationsEnvoyees
        };
    } catch (error) {
        console.error("Erreur vérification seuils:", error);
        return {
            success: false,
            error: error.message
        };
    }
};