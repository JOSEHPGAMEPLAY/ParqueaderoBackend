const jwt = require('jsonwebtoken');

const authenticatedToken = (req, res, next) =>{
    token = req.cookies?.token;
    
    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
        const verifed = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verifed;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Token inválido o expirado' });
    }
};

module.exports = authenticatedToken;