![Backend](https://img.shields.io/badge/Backend-Node.js-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen?logo=mongodb)
![License](https://img.shields.io/badge/License-MIT--CC--No--Commercial-blue)

# 🚗 Parqueadero Backend API

Este es el backend del sistema de gestión de parqueadero **La Perla**, desarrollado con **Express.js** y **MongoDB**. Permite registrar el ingreso y salida de vehículos, calcular el tiempo y costo de parqueo, y asegurar las peticiones con JWT.

## 🛠️ Tecnologías utilizadas

* ⚙️ **Node.js** v18+
* 🚀 **Express.js**
* 🛡️ **JWT (jsonwebtoken)**
* 🔐 **bcrypt**
* 🧠 **MongoDB** + Mongoose ODM
* 🕒 **Moment-Timezone**
* 🌐 **CORS** y **Body-Parser**
* 📦 **dotenv** para variables de entorno

---

## 📁 Estructura del proyecto

```bash
ParqueaderoBackend/
├── controllers/       # Lógica de negocio
├── models/            # Modelos de Mongoose
├── routes/            # Rutas Express
├── middlewares/       # Validaciones y autenticación
├── config/            # Configuración general y conexión a DB
├── server.js          # Punto de entrada principal
├── .env               # Variables de entorno
└── package.json
```

---

## ⚙️ Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/JOSEHPGAMEPLAY/ParqueaderoBackend.git
cd ParqueaderoBackend
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env` en la raíz con el siguiente contenido:

```env
DB_URI='mongodb+srv://<usuario>:<contraseña>@cluster.mongodb.net/NombreBD'
DB_USER="<usuario>"
DB_PASS="<contraseña>"
PORT=3000
JWT_SECRET="clave-secreta"
JWT_EXPIRATION="8h"
PRICE=1000
```

> 🔐 **¡Importante!** Nunca subas el archivo `.env` al repositorio. Usa `.gitignore`.

4. Inicia el servidor:

```bash
npm start
```

---

## 🔐 Seguridad

* Contraseñas encriptadas con **bcrypt**
* Autenticación y autorización con **JWT**
* Validación de roles y accesos desde middleware personalizado

---

## ✍️ Autor

* Jose Hernando Vera Jaimes

---

## ⚖️ Licencia

Este proyecto está licenciado bajo los términos de la licencia [MIT con Commons Clause](./LICENSE).

> ⚠️ **No se permite el uso comercial sin autorización explícita del autor.**
