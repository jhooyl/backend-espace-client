import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: [
        "expiration",
        "conso",
        "facture",
        "paiement",
        "modif-abonnement",
        "reclamation",
        "warning",
        ],
        required: true,
    },
    titre: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    lu: {
        type: Boolean,
        default: false,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
