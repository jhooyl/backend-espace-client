import dotenv from "dotenv";
dotenv.config(); // 👈 Charger en premier les variables d'env

import mongoose from "mongoose";
import Abonnement from '../models/abonnementModel.js';
import Consommation from '../models/consommationModel.js';
import '../models/userModel.js'; 

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("📊 Connecté à MongoDB");
  } catch (err) {
    console.error("❌ Erreur de connexion à MongoDB:", err);
    process.exit(1);
  }
}

// Helper : extraire une estimation logique à partir d'une offre
const estimerConsommation = (offre, isHalfDay = true) => {
  if (!offre) return 0;

  let baseConsommation = 0;

  if (offre.includes("GO") || offre.includes("To")) {
    const match = offre.match(/(\d+(?:[.,]?\d+)?)/);
    if (match) {
      const go = parseFloat(match[1].replace(",", "."));
      // Diviser par 60 au lieu de 30 pour obtenir la consommation par demi-journée
      const parJour = go / (isHalfDay ? 60 : 30);
      baseConsommation = Math.floor(Math.random() * (parJour * 1.3 - parJour * 0.7) + parJour * 0.7);
    }
  } else if (offre.includes("Mbps") || offre.includes("Mega") || offre.includes("Giga")) {
    const match = offre.match(/(\d+(?:[.,]?\d+)?)/);
    if (match) {
      let mbps = parseFloat(match[1].replace(",", "."));
      
      // Convertir Giga en Mega si nécessaire
      if (offre.includes("Giga")) {
        mbps = mbps * 1000;
      }
      
      // La consommation est proportionnelle à la vitesse
      const base = mbps * 5; // Ex : 15 Mbps → ~75 Mo par demi-journée
      // Ajout d'une variation aléatoire
      baseConsommation = Math.floor(Math.random() * (base * 1.2 - base * 0.6) + base * 0.6);
      
      // Si c'est une offre Gamers, on augmente la consommation
      if (offre.includes("Gamers")) {
        baseConsommation = baseConsommation * 1.5;
      }
    }
  } else if (offre.includes("DA")) {
    // Pour les offres en DA, on estime en fonction du prix
    const match = offre.match(/(\d+)/);
    if (match) {
      const prix = parseInt(match[1]);
      baseConsommation = Math.floor(prix / 10) * (isHalfDay ? 0.5 : 1);
    }
  }

  // Si aucune estimation n'a été possible, utiliser une valeur par défaut
  if (baseConsommation === 0) {
    baseConsommation = Math.floor(Math.random() * 250 + 100); // par défaut pour une demi-journée
  }

  return Math.max(1, Math.floor(baseConsommation)); // au moins 1 Mo/minute
};

const simulate = async () => {
  try {
    await connectDB();
    
    const abonnements = await Abonnement.find().populate("userId");
    
    if (abonnements.length === 0) {
      console.log("⚠️ Aucun abonnement trouvé");
      await mongoose.disconnect();
      return;
    }

    console.log(`📊 Simulation pour ${abonnements.length} abonnements...`);
    
    for (const ab of abonnements) {
      if (!ab.userId) {
        console.log(`⚠️ Abonnement sans utilisateur, ID: ${ab._id}`);
        continue;
      }

      // 🚫 Vérifie si l'abonnement est expiré
      const now = new Date();
      if (ab.dateExpiration < now) {
        console.log(`⛔ Abonnement expiré pour ${ab.userId.email || ab.userId._id}, pas de consommation générée.`);
        continue;
      }
      // Mettre à jour le volume consommé
      await updateVolumeConsomme(ab._id);
      // Si l'abonnement a atteint sa limite, ne pas générer de consommation
      if (ab.statut === "limite_atteinte") {
        console.log(`⛔ Limite atteinte pour ${ab.userId.email || ab.userId._id}, pas de consommation générée.`);
        continue;
      }
      const user = ab.userId;
      const mapType = {
        "Internet": "internet",
        "Téléphonie": "telephonie"
      };
      const type = mapType[ab.type] || "internet";
      const offreChoisie = ab.debitOuVolume;
      
      // Calculer la consommation pour une demi-journée
      const quantite = estimerConsommation(offreChoisie, true);

      const newConso = new Consommation({
        userId: user._id,
        abonnementId: ab._id,
        type,
        quantite,
        date: new Date()
      });

      await newConso.save();
      console.log(`📊 ${user.email || user._id} (${offreChoisie}) → ${quantite} ${type === "internet" ? "Mo" : "minutes"}`);
    }

    console.log("✅ Simulation terminée avec succès.");
    await mongoose.disconnect();
    
  } catch (err) {
    console.error("❌ Erreur durant la simulation:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Exécuter la simulation
simulate();