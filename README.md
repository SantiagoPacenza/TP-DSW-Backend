# TP-DSW-Backend

## Guía de Inicio Rápido

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/SantiagoPacenza/TP-DSW-Backend.git
cd TP-DSW-Backend
npm install
```

### 2. Configuración de la Base de Datos Local

- En workbench, conectate a tu servidor local con usuario root.
- Abri un nuevo script y pega y ejecuta los siguientes comandos, uno por uno.

```bash
CREATE DATABASE IF NOT EXISTS gimnasio;
CREATE USER IF NOT EXISTS 'gimnasio_user'@'localhost' IDENTIFIED BY 'dsw';
GRANT ALL PRIVILEGES ON gimnasio.* TO 'gimnasio_user'@'localhost';
```

- Cerrá la pestaña de conexión del usuario root y crea una nueva conexión (símbolo + al lado de MySQL Connections)
- En connection name poné local-gimnasio, en host-name localhost, en port deja 3306, en username gimnasio_user, en default schema gimnasio, y en password apreta store in vault y pone dsw, para que no te pida la contraseña cada vez que entras a esa conexión.

### 3. Configurar las Variables de Entorno

- Copiá el archivo .env.example y pegalo al mismo nivel que el readme, package.json, etc. y renombralo como .env
- Abrilo y pegá las credenciales

```bash
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=gimnasio_user
DB_PASSWORD=
DB_NAME=gimnasio
```

### 4. Iniciar el Servidor

- Una vez configurado todo, levanta el servidor en modo desarrollo:

```bash
npm run start:dev
```

- Si está todo bien, en la terminal deberias ver varias consultas SQL que MikroORM ejecutó y el último mensaje debería ser: Servidor escuchando en http://localhost:3000
- Por ultimo copiá y pega el siguiente link en tu navegador: http://localhost:3000/health . Deberías recibir un {"ok": true}.
