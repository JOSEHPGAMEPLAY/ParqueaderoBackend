const authenticatedToken = require('./auth'); // Importar el middleware de autenticación

const roleCheck = (roles) => {
    return (req, res, next) => {
        // Asegúrate de que el middleware authenticatedToken ya haya agregado el usuario al request
        if (!req.user) {
            return res.status(401).json({ message: 'Acceso denegado. No autenticado' });
        }

        // Verificar si el rol del usuario está en el arreglo de roles permitidos
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
        }

        next();
    };
};

module.exports = roleCheck;
