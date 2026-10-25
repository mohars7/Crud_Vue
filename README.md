# Sistema de reserves amb autenticació JWT i CRUD

Aplicació amb **Node.js** i **Express** que combina:

- Un sistema d'**autenticació i autorització** amb **JSON Web Tokens (JWT)** guardats en una cookie segura.
- Una **API REST** amb 4 CRUD complets: usuaris, recursos, reserves i notificacions.
- Plantilles **EJS** per al frontal.

## Posada en marxa

```bash
npm install
npm start
```

El servidor escolta a `http://localhost:3000` (es pot canviar amb la variable `PORT`).
Per a desenvolupament: `npm run dev` (reinicia en canviar el codi).

Variables d'entorn opcionals: `PORT`, `JWT_SECRET` i `NODE_ENV=production` (activa la cookie `secure`, que només viatja per HTTPS).

## Usuaris d'exemple

| Usuari | Contrasenya | Rol |
|---|---|---|
| `admin` | `admin1234` | admin |
| `maria` | `maria1234` | user |
| `joan` | `joan1234` | user |

## Estructura

```
projecte/
├── server.js               Punt d'entrada i configuració d'Express
├── config.js               Port, secret JWT, caducitat i opcions de la cookie
├── repository.js           Accés genèric als fitxers JSON
├── user-repository.js      Repositoris (usuaris amb bcrypt, recursos, reserves, notificacions)
├── validators.js           Validacions de dades
├── middleware/auth.js      Middleware JWT i control de rols
├── routes/                 auth, users, resources, bookings, notifications
├── views/                  index, login, profile, protected (EJS)
├── public/styles.css
├── db/                     Dades d'exemple en JSON
└── requests.http           Proves per a l'extensió REST Client
```

## Autenticació

- Les contrasenyes es guarden xifrades amb **bcrypt** (10 rondes). Mai s'envien en les respostes.
- En fer login es genera un **JWT** (`jsonwebtoken`) que **caduca en 1 hora** i es desa en la cookie `access_token` amb `httpOnly`, `sameSite: strict` i `secure` (en producció).
- El middleware `loadSession` llegeix el token (cookie o capçalera `Authorization: Bearer <token>`), el verifica i carrega l'usuari a `req.session.user`.
- `requireAuth` protegeix les rutes de l'API (respon `401`), `requireLogin` les pàgines (redirigeix a `/login`) i `requireRole('admin')` les accions d'administrador (`403`).

### Rutes d'autenticació i pàgines

| Mètode | Ruta | Descripció | Accés |
|---|---|---|---|
| GET | `/` | Pàgina d'inici | Públic |
| GET | `/login` | Formularis d'accés i registre | Públic |
| POST | `/register` | Registra un usuari (`username`, `email`, `password`) | Públic |
| POST | `/login` | Inicia sessió (`username` o correu, `password`) | Públic |
| GET/POST | `/logout` | Tanca la sessió (esborra la cookie) | Públic |
| GET | `/protected` | Pàgina privada amb les teves reserves i notificacions | Autenticat |
| GET | `/profile` | Dades de l'usuari loguejat | Autenticat |

Les rutes `/register`, `/login` i `/logout` accepten formularis HTML i JSON (responen JSON si la petició és `application/json`).

## API REST

Totes les rutes següents **requereixen estar autenticat** (`401` si no).

### Usuaris — `/users`

| Mètode | Ruta | Descripció | Permisos |
|---|---|---|---|
| GET | `/users` | Llista d'usuaris | admin |
| GET | `/users/:id` | Detall d'un usuari | admin o el mateix usuari |
| POST | `/users` | Crea un usuari (pot indicar `role`) | admin |
| PUT | `/users/:id` | Modifica un usuari. Només un admin pot canviar el `role` | admin o el mateix usuari |
| DELETE | `/users/:id` | Elimina un usuari (no pots eliminar-te a tu mateix) | admin |

### Recursos — `/resources`

Camps: `name`, `description`, `capacity`.

| Mètode | Ruta | Descripció | Permisos |
|---|---|---|---|
| GET | `/resources` | Llista de recursos | autenticat |
| GET | `/resources/:id` | Detall | autenticat |
| POST | `/resources` | Crea un recurs | admin |
| PUT | `/resources/:id` | Modifica un recurs | admin |
| DELETE | `/resources/:id` | Elimina un recurs (`409` si té reserves) | admin |

### Reserves — `/bookings`

Camps: `resourceId`, `start`, `end` (dates ISO 8601), `userId` (assignat automàticament).

| Mètode | Ruta | Descripció | Permisos |
|---|---|---|---|
| GET | `/bookings` | Les teves reserves (l'admin les veu totes) | autenticat |
| GET | `/bookings/:id` | Detall | propietari o admin |
| POST | `/bookings` | Crea una reserva. L'admin pot indicar `userId` | autenticat |
| PUT | `/bookings/:id` | Modifica l'horari o el recurs | propietari o admin |
| DELETE | `/bookings/:id` | Cancel·la la reserva | propietari o admin |

### Notificacions — `/notifications`

Camps: `userId`, `message`, `read`.

| Mètode | Ruta | Descripció | Permisos |
|---|---|---|---|
| GET | `/notifications` | Les teves notificacions (l'admin les veu totes) | autenticat |
| GET | `/notifications/:id` | Detall | propietari o admin |
| POST | `/notifications` | Envia una notificació a un usuari | admin |
| PUT | `/notifications/:id` | Marca com a llegida (`read`). Només l'admin pot canviar el `message` | propietari o admin |
| DELETE | `/notifications/:id` | Elimina | propietari o admin |

## Regles de negoci

- Només els **usuaris autenticats** poden accedir a les rutes CRUD.
- Els **tokens JWT caduquen després d'1 hora**.
- **Solapaments:** no es pot reservar un recurs en un horari que ja està ocupat (`409`). Dues reserves consecutives (una acaba quan l'altra comença) sí que són vàlides.
- **Dates:** l'inici ha de ser anterior al final i no es poden fer reserves en el passat (`400`).
- **Rols:** `admin` gestiona usuaris, recursos i notificacions i veu totes les reserves; `user` només gestiona les seves reserves i notificacions.
- **Notificacions automàtiques:** en crear, modificar o cancel·lar una reserva, el propietari rep una notificació.
- No es pot eliminar un recurs que té reserves.

## Validacions

- Nom d'usuari: 3–30 caràcters (lletres, números i `_`), únic.
- Correu electrònic amb format vàlid, únic.
- Contrasenya: mínim 8 caràcters.
- Capacitat dels recursos: enter major que 0.
- Missatges d'error clars amb els codis `400`, `401`, `403`, `404` i `409`.

## Proves

Hi ha un fitxer `requests.http` amb totes les peticions per a l'extensió **REST Client** de VS Code (també es poden fer a mà amb Postman). Cal executar primer el login i després la resta; la cookie es reutilitza automàticament.
