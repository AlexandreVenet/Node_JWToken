// Le package utilisé
const jwt = require('jsonwebtoken');

// Une fonction de génération de jeton
async function generateToken(user, secret, refresh)
{
    const payload = 
    { 
        id: user.id,
        role: user.role,
    };
	
    return await jwt.sign(
        payload, 
        secret,
        {
            expiresIn: refresh,
        }
    );
}

// Maitenant, une fonction permettant de générer les deux jetons ACCESS et REFRESH.
// On l'appelera dans une route servant à authentifier l'utilisateur.
async function SetTokens(body) 
{
    const access_token = await generateToken(body, process.env.SECRET_ACCESS, process.env.REFRESH_ACCESS);
    const refresh_token = await generateToken(body, process.env.SECRET_REFRESH, process.env.REFRESH_REFRESH);
    
    return {
        access_token,
        refresh_token,
    };
}

// Une fois les jetons fournis, on utilise l'ACCESS pour accéder aux routes où l'authentification est requise.
// Côté serveur, chaque route vérifie si le jeton est valide.
// Pour cela, on passe par un middleware (observer la syntaxe de l'appel de fonction).

// Middleware : tester la structure du jeton
const extractBearerToken = headerValue => 
{
	// Si le header n'est pas un string, erreur
    if (typeof headerValue !== 'string') 
	{
        return false
    }

	// Le JWToken commence toujours par "bearer ", vérifions tout cela et renvoyons le résultat.
    const matches = headerValue.match(/(bearer)\s+(\S+)/i);
    return matches && matches[2];
}

// Middleware : fonction de vérification d'ACCESS
const MiddlewareCheckACCESS = (req, res, next) => {
    
    // Récupération 
    const token = req.headers.authorization && extractBearerToken(req.headers.authorization);

    // Si ça ne va pas, erreur
    if (!token) 
	{
        // return res.json({ message: 'Error. Need a token' })
		res.status(403).json({message: '403 : accès définitivement interdit.'});
        return;
    }

    // Vérifier le token ACCESS (c'est celui qu'on utilise)
    jwt.verify(token, process.env.SECRET_ACCESS, (err, decodedToken) => 
	{
        // Si jeton expiré, renvoi réponse "401 unauthorized"
        if (err) 
		{
            res.status(401).json({message: 'Autorisation requise.'});
        } 
		// Si ok, renvoi de la méthode permettant de lancer le prochain middleware ou la prochaine commande
		else 
		{
            return next();
        }
    });
}

// Maintenant, on peut avoir besoin, dans certaines routes, de lire le contenu du jeton si celui-ci contient des informations utiles.
// Pour cela, une fonction qui en renvoie le contenu déchiffré
function DecodeToken(req)
{
    // Récupération (ici aussi car on ne peut pas récupérer de la fonction du middleware ?)
    const token = req.headers.authorization && extractBearerToken(req.headers.authorization)
    // Déchiffrage du payload (sans vérification car déjà fait) sans le header (mettre à true pour voir)
    const decoded = jwt.decode(token, { complete: false });
	// Renvoi
    return decoded;
}

// L'ACCESS est pensé en général pour durer moins longtemps que le REFRESH.
// Pour tester, on attend qu'il expire.
// Lorsqu'il est expiré, la route de test renvoie de façon attendue une erreur 401.
// Alors, le front, lorsqu'il reçoit cette 401 va sur une route spéciale qui sert à rafraîchir le jeton de connexion.
// Il va cette fois envoyer le jeton REFRESH.

// Fonction de vérification de REFRESH et renvoi d'un nouveau ACCESS
async function CheckREFRESH(req, res)
{
	// Récupération 
    const token = req.headers.authorization && extractBearerToken(req.headers.authorization);
	
    // Si ça ne va pas, erreur
    if (!token) 
	{
		res.status(403).json({message: 'Accès interdit.'});
    }
	
	// Lire le payload du jeton déchiffré
    const decoded = jwt.decode(token, { complete: false });
	
    // Vérifier le token REFRESH (c'est celui qu'on utilise pour rafraîchir l'ACCESS)
    jwt.verify(token, process.env.SECRET_REFRESH, async (err, decodedToken) => 
	{
        // Si jeton expiré, alors renvoi de "403 forbidden" signifiant que la connexion est définitivement rompue.
        if (err) 
		{
			res.status(403).json({message: 'Accès interdit.'});
        } 
		else
		{
			// Ici, c'est ok. Regénérer un jeton, ici identique au premier
			const tokenAccess = await generateToken(decoded, process.env.SECRET_ACCESS, process.env.REFRESH_ACCESS);
		    // res.status(200).json(access_token);
			res.send({access_token: tokenAccess});
		}
    });
}

// Une fois que le nouveau jeton ACCESS est renvoyé, que le fait le front ?
// Il relance la requête de test (où il y avait 401).
// On constate qu'on a de nouveau accès au contenu... jusqu'à la prochaine expiration d'ACCESS.

// Exporter le nécessaire
module.exports = 
{
	SetTokens,
	MiddlewareCheckACCESS,
	DecodeToken,
	CheckREFRESH
}