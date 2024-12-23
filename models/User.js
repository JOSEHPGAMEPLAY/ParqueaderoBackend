const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },role: {
        type: String,
        enum: ["admin", "user", "owner"],
        default: "user",
    },
    isActive: {
        type: Boolean,
        default: false,
    },
});

// Middleware para hash de contraseña antes de guardar
userSchema.pre("save", async function (next) {
    if(!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Metodo para comparar contraseñas
userSchema.methods.comparePassword = async function (password){
    return bcrypt.compare(password, this.password);
};

// Método estático para deshabilitar o habilitar usuarios
userSchema.statics.toggleUserStatus = async function (userId, isActive) {
    return this.findByIdAndUpdate(userId, { isActive }, { new: true });
};

const User = mongoose.model('User', userSchema);
module.exports = User;