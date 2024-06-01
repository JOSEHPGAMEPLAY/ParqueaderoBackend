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
        const user = await User.findOne({username});
        if (!user) return res.status(400).json({message: "Usuario o contarseña incorrectos"}); 

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({message: "Usuario o contarseña incorrectos"});
        
        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET,{
            expiresIn:process.env.JWT_EXPIRATION,
        });
        res.status(200).json({token})
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};
