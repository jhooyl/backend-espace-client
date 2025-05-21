import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Abonnement from '../models/abonnementModel.js';
import { updateVolumeConsomme, resetCompteursSiNecessaire } from '../utils/abonnementUtils.js';

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("📊 Connecté à MongoDB");
    } catch (err) {
        console.error("❌ Erreur de connexion à MongoDB:", err);
        process.exit(1);
    }
    }

    const manageAbonnements = async () => {
    try {
        await connectDB();
        
        // 1. Réinitialiser les compteurs si nécessaire (nouveau cycle)
        await resetCompteursSiNecessaire();
        
        // 2. Marquer les abonnements expirés
        const now = new Date();
        
        const expiredAbonnements = await Abonnement.find({ 
            dateExpiration: { $lt: now },
            statut: { $ne: "expire" }
        });
        
        for (const ab of expiredAbonnements) {
            ab.statut = "expire";
            await ab.save();
        
            await sendNotification({
                userId: ab.userId,
                type: "alerte",
                titre: "Abonnement expiré",
                message: "Votre abonnement est arrivé à expiration. Pensez à le renouveler pour éviter toute interruption."
            });
        }
        console.log(`🔄 ${expiredAbonnements.length} abonnements marqués comme expirés`);
        
        
        // 3. Mettre à jour tous les volumes consommés
        const abonnements = await Abonnement.find({ statut: { $in: ["actif", "limite_atteinte"] } });
        
        console.log(`📊 Mise à jour des volumes pour ${abonnements.length} abonnements actifs...`);
        
        for (const ab of abonnements) {
        await updateVolumeConsomme(ab._id);
        }
        
        console.log("✅ Gestion des abonnements terminée avec succès.");
        await mongoose.disconnect();
        
    } catch (err) {
        console.error("❌ Erreur durant la gestion des abonnements:", err);
        await mongoose.disconnect();
        process.exit(1);
    }
    };

// Exécuter le script
manageAbonnements();