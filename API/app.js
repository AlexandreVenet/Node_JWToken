// On veut gérer un token avec refresh.
// Pour les tests, on a défini les expirations de jeton à des durées très courtes.

// On utilise les variables d'environnement 
require('dotenv').config();

// On utilise express
const express = require('express');

// Et aussi cors
const cors = require('cors')

// On utilise ce package pour les tokens
// const jwt = require('jsonwebtoken');

// Ici, on importe notre propre module de gestion de jetons
// Voir le script token.js.
const myToken = require('./token');

// Instance d'Express
const app = express();

// Utiliser CORS
app.use(cors());

// Utiliser les données au format json
app.use(express.json());

// https://stackoverflow.com/questions/47232187/express-json-vs-bodyparser-json
// app.use(express.urlencoded({ extended: true }));

// Pour l'exemple, on code les routes ici.

// S'authentifier
app.post('/login', async (req, res) =>
{
	console.log("On me demande /login avec :", req.body);
	
	// Si pas de body ?
	// if(!req.body)
	// {
	// 	res.status(200).send({message:"Données manquantes"});
	// 	console.log("On m'envoie :", req.body);
	// 	return;
	// }
	
	// Ajouter de quoi tester les entrées...
	
	// Tester les valeurs valides	
	if(!req.body.Id || req.body.Id != 1)
	{
		res.status(200).send({message:"Erreur Id. La valeur attendue est 1."})
		return;
	}
	
	if(!req.body.Role || req.body.Role != 'admin')
	{
		res.status(200).send({message:"Erreur Role. La valeur attendue est 'admin'."})
		return;
	}
	
	const retour = await myToken.SetTokens(req.body);
	res.status(200).send(retour);
});

// Vérifier le jeton (avec middleware) 
app.get('/test', myToken.MiddlewareCheckACCESS, async (req, res) =>
{
	console.log(req.query.chose);
	
	// Lire le payload du jeton et le renvoyer pour rire.
	const decoded = myToken.DecodeToken(req);
	res.send({access_token:decoded});
	
	console.log("On me demande : /test");
});

// Rafraîchir le jeton ACCESS
app.post('/refresh', async (req, res) =>
{		
	await myToken.CheckREFRESH(req, res);
	
	console.log("On me demande : /refresh");
});

// Pour tester avec Postman :
// 1. lancer http://localhost:3000/login
// 2. Copier le jeton ACCESS.
// 3. Lancer http://localhost:3000/test avec une authorization "bearer" et coller le jeton ACCESS.
// 4. Attendre et relancer jusqu'à obtenir l'erreur 401.
// 5. Copier le jeton REFRESH.
// 5. Lancer http://localhost:3000/refresh avec une authorization "bearer" et coller le jeton REFRESH.
// 6. On reçoit le nouveau jeton ACCESS (ou bien tout est fini avec 403).
// 7. Copier le nouveau jeton.
// 8. Lancer http://localhost:3000/test avec le nouveau jeton. Constater qu'on a à nouveau accès au données.

// Choix du port de communication
const port = 3000;

// Ecouter le port et afficher une info au lancement
app.listen(port, () =>
{
	console.log('\n==============================================');
	console.log(`Projet démarré sur : http://localhost:${port}`);
	console.log('==============================================\n');
});

