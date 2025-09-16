const User = require('../models/User');
const jwt = require('jsonwebtoken');
const ms = require("ms");

// Registro 
exports.register = async (req, res)  => {
     const {username, password} = req.body;
    try {

        const existingUser = await User.findOne({username});

        if (existingUser) return res.status(400).json({message: "El usuario ya existe"});

        const newUser = new User({username, password});
        await newUser.save();

        res.status(201).json({message:'Usuario registrado con éxito'});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// Login
exports.login = async function (req,res){
    const {username, password} = req.body;

    try {
        // Verificar si el usuario existe
        const user = await User.findOne({username});
        if (!user) return res.status(400).json({message: "Usuario o contarseña incorrectos"}); 

        // Verificar si el usuario está habilitado
        if (!user.isActive) {
            return res.status(403).json({ message: "Usuario deshabilitado. Contacte al administrador." });
        }

        // Verificar si la contraseña es correcta  (comparación con la encriptada)
        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({message: "Usuario o contarseña incorrectos"});
        
        // Generar el token JWT
        const token = jwt.sign(
            {userId: user._id, username: user.username ,role: user.role},
            process.env.JWT_SECRET,
            {expiresIn:process.env.JWT_EXPIRATION,}
        );

        const maxAge = ms(process.env.JWT_EXPIRATION);

        const isProd = process.env.NODE_ENV === "production";

        // Guardar el token en una cookie segura
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge
        });

        res.status(200).json({message: "Login exitoso"});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

// Logout
exports.logout = async function (req, res) {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: false,
            sameSite: "strict"
        });

        res.status(200).json({message: "Sesión cerrada"});
    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

exports.getCurrentUser = async function (req, res) {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "No autorizado, no hay token" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.status(200).json({ valid: true, user: decoded });
    } catch {
        return res.status(401).json({ valid: false, message: "Token inválido o expirado" });
    }
}
