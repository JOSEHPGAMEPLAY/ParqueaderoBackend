const jwt = require('jsonwebtoken');

const authenticatedToken = (req, res, next) =>{
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado o malformado' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) return res.status(401).json({message:'Acceso denegado'});

    try {
        const verifed = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verifed;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Token inválido o expirado' });
    }
};

module.exports = authenticatedToken;