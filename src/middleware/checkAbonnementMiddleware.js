import Abonnement from "../models/abonnementModel.js";

const checkAbonnementMiddleware = async (req, res, next) => {
    const abonnement = await Abonnement.findOne({ userId: req.user.userId });

    if (!abonnement) {
        return res.status(403).json({
            success: false,
            message: "Aucun abonnement trouvé.",
            code: "NO_SUBSCRIPTION"
        });
    }

    const now = new Date();
    if (abonnement.dateExpiration < now) {
        return res.status(403).json({
            success: false,
            message: "Votre abonnement a expiré.",
            code: "SUBSCRIPTION_EXPIRED"
        });
    }
    req.user.abonnement = abonnement;
    next();
};

export default checkAbonnementMiddleware;