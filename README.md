# TP-DSW-Backend

## Guía de Inicio Rápido

### Requisitos previos

- Git para clonar el repositorio.
- Node.js 24.14.0 y npm.
- MySQL Server 8.0.
- MySQL Workbench para ejecutar los pasos de configuración de la base de datos.

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/SantiagoPacenza/TP-DSW-Backend.git
cd TP-DSW-Backend
npm install
```

### 2. Configuración de la Base de Datos Local

- En MySQL Workbench, conectate a tu servidor local con el usuario `root` y la contraseña que configuraste al instalar MySQL.
- Abrí un nuevo script SQL y pegá y ejecutá los siguientes comandos, uno por uno.

```sql
CREATE DATABASE IF NOT EXISTS gimnasio;
CREATE USER IF NOT EXISTS 'gimnasio_user'@'localhost' IDENTIFIED BY 'dsw';
GRANT ALL PRIVILEGES ON gimnasio.* TO 'gimnasio_user'@'localhost';
```

- Cerrá la pestaña de conexión del usuario root y crea una nueva conexión (símbolo + al lado de MySQL Connections)
- En connection name poné local-gimnasio, en host-name localhost, en port deja 3306, en username gimnasio_user, en default schema gimnasio, y en password apreta store in vault y pone dsw, para que no te pida la contraseña cada vez que entras a esa conexión.

### 3. Configurar las Variables de Entorno

- Copiá el archivo .env.example y pegalo al mismo nivel que el readme, package.json, etc. y renombralo como .env
- Abrilo y pegá las credenciales

```dotenv
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=gimnasio_user
DB_PASSWORD=dsw
DB_NAME=gimnasio
SECRET_KEY_JWT=tp_dsw_gimnasio_utn_secret_key_jwt_2026_segura
```

### 4. Iniciar el Servidor

- Desde la carpeta `TP-DSW-Backend`, iniciá el servidor en modo desarrollo:

```bash
npm run start:dev
```

- Si está todo bien, en la terminal deberías ver varias consultas SQL y el mensaje: `Servidor escuchando en http://localhost:3000`.
- Dejá esta terminal abierta y el servidor en ejecución. Para usar la aplicación, seguí el [README del frontend](https://github.com/german-a-rodriguez/TP-DSW-Frontend#readme) en otra terminal.
- Para detener el servidor, presioná `Ctrl+C` en su terminal.

### Otros scripts disponibles

- `npm run build`: compila el backend en la carpeta `dist`.
- `npm start`: ejecuta el backend ya compilado. Primero ejecutá `npm run build`; MySQL y el archivo `.env` también son necesarios en este modo.

### Credenciales del Administrador:

- Email: admin@gmail.com
- Contraseña: admin1234
