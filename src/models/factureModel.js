import mongoose from "mongoose";

const factureSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    abonnementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Abonnement",
        required: true
    },
    montant: {
        type: Number,
        required: true
    },
    datePaiement: {
        type: Date,
        default: null
    },
    dateEmission: {
        type: Date,
        default: Date.now
    },
    dateEcheance: {
        type: Date,
        required: true
    },
    statut: {
        type: String,
        enum: ["En attente", "Payée", "En retard", "Annulée"],
        default: "En attente"
    },
    paymentMethod: {
        type: String,
        enum: ['CIB', 'DAHABIA','unpaid'],
        default: 'unpaid' 
    },
    reference: {
        type: String,
        required: true,
        unique: true
    },
    details: {
        type: Object,
        required: true
    }
}, { timestamps: true });

const Facture = mongoose.model("Facture", factureSchema);
export default Facture;