const adminMiddleware = (req, res, next) => {
    console.log("Middleware Admin - User Info:", req.user); // Ajoute ce log

    if (req.user && req.user.role === "admin") {
        return next();
    }
    return res.status(403).json({ 
        success: false, 
        message: "Accès refusé : droits administrateur requis" 
    });
};

export default adminMiddleware;
