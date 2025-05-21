import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL); 
        console.log("MongoDB connecté !");
    } catch (error) {
        console.error("Erreur de connexion à MongoDB:", error);
        process.exit(1);
    }
};

export default connectDB;
