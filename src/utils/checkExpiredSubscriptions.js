import Abonnement from "../models/abonnementModel.js";
import HistoriqueAbonnement from "../models/historiqueAbonnementModel.js";
import sendNotification from "../utils/sendNotification.js";

export const checkExpiredSubscriptions = async () => {
    try {
        const currentDate = new Date();
        console.log(`Date actuelle : ${currentDate}`);
        
        // Trouver tous les abonnements actifs qui ont expiré
        const expiredSubscriptions = await Abonnement.find({
            dateExpiration: { $lt: currentDate },
            statut: "Actif"
        });
        
        console.log(`Trouvé ${expiredSubscriptions.length} abonnements expirés`);
        
        // Mettre à jour chaque abonnement expiré
        for (const abonnement of expiredSubscriptions) {
            console.log(`Vérification de l'abonnement ${abonnement._id}`);
            console.log(`Date d'expiration : ${abonnement.dateExpiration}`);
            
            // Si l'abonnement est expiré, on le met à jour
            if (abonnement.dateExpiration < currentDate) {
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
                    statut: "Terminé",
                    options: abonnement.options
                });
                
                await historiqueEntry.save();
                console.log(`Historique ajouté pour l'abonnement ${abonnement._id}`);
                
                // Mettre à jour le statut de l'abonnement
                abonnement.statut = "Terminé";
                await abonnement.save();
                console.log(`Abonnement ${abonnement._id} mis à jour avec le statut "Terminé"`);
                
                // Envoi de la notification
                const notificationSent = await sendNotification({
                    userId: abonnement.userId,
                    type: "expiration",
                    titre: "Abonnement expiré",
                    message: "Ton abonnement est arrivé à expiration. Renouvelle-le pour continuer à profiter du service 💡"
                });
                
                if (notificationSent) {
                    console.log(`Notification envoyée à l'utilisateur ${abonnement.userId}`);
                } else {
                    console.log(`Échec de l'envoi de la notification pour l'utilisateur ${abonnement.userId}`);
                }
            }
        }
        
        return {
            success: true,
            count: expiredSubscriptions.length
        };
    } catch (error) {
        console.error("Erreur lors de la vérification des abonnements expirés:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

