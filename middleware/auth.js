const jwt = require('jsonwebtoken');

const authenticatedToken = (req, res, next) =>{
    const token = req.header('Authorization').replace('Bearer ','');

    if (!token) return res.status(401).json({message:'Acceso denegado'});

    try {
        const verifed = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verifed;
        next();
    } catch (error) {
        res.status(400).json({message: error.message});
    }
};

module.exports = authenticatedToken;