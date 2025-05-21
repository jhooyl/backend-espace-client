import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    numTel: { type: String, required: true, unique: true },
    MSISDN: { type: String, required: true, unique: true },
    numClient: { type: String, required: true, unique: true },
    mobile: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["client", "admin"],
        default: "client"
    },
    clientType: {
        type: String,
        enum: ["particulier", "professionnel"],
        required: false
    },
    reclamations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reclamation" }],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    twoFactorCode: String,  //2fa code
    twoFactorExpires: Date  
}, { timestamps: true });

// Validation conditionnelle
userSchema.pre('validate', function(next) {
    if (this.role === 'client' && !this.clientType) {
        this.invalidate('clientType', 'clientType est obligatoire pour les clients', this.clientType);
    }
    next();
});

export default mongoose.model("User", userSchema);


/*
http://localhost:5000/api/users/register
http://localhost:5000/api/users/login
http://localhost:5000/api/users/profile
http://localhost:5000/api/users/profile/update
http://localhost:5000/api/users/admin/allUsers
http://localhost:5000/api/users/verify2fa
http://localhost:5000/api/consommation/simuler
http://localhost:5000/api/consommation/historique

particulier :
{
    "identifier":"gtokyo31@yahoo.com",
    "password":"YasminaVeutSavoir@88"
}
    previous password:Doesitworkyesorno123!, NouveauMotDePasse@2025

{
    "identifier": "gtokyo31@yahoo.com", 
    "twoFactorCode":"" 
}
admin :
{   
    "identifier": "admin@test.com",
    "password": "AdminSecure123!"
}
{
    "identifier":"johnbudajohn@gmail.com",
    "password":"Admin@12345!"
}

profesionnel :
{  
    "identifier": "client1@test.com"
    "password": "client1psh"
}

professionnel :
{
    "identifier": "talmatammaramira@gmail.com",
    "password": "PasswordFort123!"
}
{
    "identifier": "talmatammaramira@gmail.com", 
    "twoFactorCode":"" 
}

{
    "email": "touatitlibayasmina@gmail.com",
    "password": "Admin@12345!"
}




*/
