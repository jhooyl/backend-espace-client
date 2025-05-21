import mongoose from "mongoose";

const abonnementSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    categorie: {
        type: String,
        enum: ["Particulier", "Professionnel"],
        required: true,
    },
    type: {
        type: String,
        enum: ["Internet", "Téléphonie"], // Type d'abonnement
        required: true,
    },
    offre: {
        type: String, // Nom de l'offre (ex : IDOOM FIBRE, Pack MOOHTARIF, etc.)
        required: true,
    },
    debitOuVolume: {
        type: String,
        required: true,
    },
    prix: {
        type: Number, 
        required: true,
    },
    duree: {
        type: String, // Durée de l'abonnement (ex: "1 mois", "6 mois", etc.)
        required: true,
    },
    dateDebut: { 
        type: Date, 
        required: true,
        default: Date.now, 
    },
    dateExpiration: {
        type: Date,
        required: true,
    },
    options: {
        augmentationDebit: { type: Boolean, default: false }
    }, // Option pour augmenter le débit
    volumeTotal: { 
        type: mongoose.Schema.Types.Mixed  // Peut être un nombre ou "Illimité"
    },
    volumeConsomme: { 
        type: Number, 
        default: 0 
    },
    dernierReset: { 
        type: Date, 
        default: Date.now 
    },
    cycleFacturation: { 
        type: String, 
        enum: ["mensuel", "hebdomadaire", "quotidien"], 
        default: "mensuel" 
    },
    statut: { 
        type: String, 
        enum: ["Actif", "actif", "suspendu", "Suspendu", "expire", "Expire", "limite_atteinte", "Terminé"], 
        default: "Actif"
    }
});

const Abonnement = mongoose.model("Abonnement", abonnementSchema);
export default Abonnement;