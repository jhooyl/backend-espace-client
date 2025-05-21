import mongoose from "mongoose";

const MONGO_URL = "mongodb+srv://jhooyl:yesitis123@pfe.gknfr7v.mongodb.net/dbconnect?retryWrites=true&w=majority";

mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connexion MongoDB réussie !"))
.catch(err => console.error("Erreur de connexion MongoDB :", err));
