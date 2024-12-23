const User = require('../models/User');
const jwt = require('jsonwebtoken');

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
        const token = jwt.sign({userId: user._id, role: user.role}, process.env.JWT_SECRET,{
            expiresIn:process.env.JWT_EXPIRATION,
        });
        res.status(200).json({token})
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
