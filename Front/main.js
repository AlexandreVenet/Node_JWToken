"use strict";

// ============================================================================
// XHR
// ============================================================================

function SetXHR(methode, url, action, body = null, params = null, jeton = null)
{
	// Instance
	let xhr = new XMLHttpRequest();
	
	// Réponse formatée en JSON
	xhr.responseType = 'json';
	
	// Selon la méthode choisie, configurer la requête
	if(methode == 'get')
	{
		if(params != null)
		{
			xhr.open(methode, url+"?"+params, true);
		}
		else
		{
			xhr.open(methode, url, true);
		}
	}
	else if(methode == 'post')
	{
		xhr.open(methode, url, true);
	}
	
	// En-tête JSON
	// xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	// Pour les jetons 
	if(jeton != null)
	{
		xhr.setRequestHeader('Authorization', 'Bearer ' + jeton);
	}
	
	// Selon la méthode choisie, configurer l'envoi
	if(methode == 'get')
	{
		xhr.send(null);
	}
	else if(methode == 'post')
	{
		xhr.send(body);
	}

	// Une fois une réponse reçue
	xhr.onload = ()=>
	{		
		action({status: xhr.status, text: xhr.statusText, reponse:xhr.response});
		// switch (xhr.status) {
		// 	case 403: // Besoin d'un jeton
		// 		action(xhr.response.message); // message est le nom de la propriété émise par le serveur
		// 		break;
		// 	case 200: // Succès
		// 		action(xhr.response);
		// 		break;
		// 	default: // Autre cas d'erreur
		// 		action({status: xhr.status, text: xhr.statusText});
		// 		break;
		// }
	}
}

// ============================================================================
// DOM Control
// ============================================================================

// Formulaire : /test sans paramètre
const formTest = document.getElementById('formTest');
const textAreaTest = document.getElementById('textAreaTest');
formTest.onsubmit = (e)=> // oui oui, "onsubmit" tout en minuscules
{
	e.preventDefault();
		
	SetXHR(formTest.method, formTest.action, (obj)=>
	{
		textAreaTest.textContent = `${obj.status}, ${obj.text}\n${JSON.stringify(obj.reponse, null, 2)}`;
	});
}


// Formulaire : /test avec paramètre
const formTest2 = document.getElementById('formTest2');
const textAreaTest2 = document.getElementById('textAreaTest2');
formTest2.onsubmit = (e)=> 
{
	e.preventDefault();
	
	// On va récupérer le jeton du LocalStorage et le passer en Header de la requête
	let jetonAccess = null;
	const objLS = LocalStorageObtenir();
	if(objLS)
	{
		jetonAccess = objLS.jetonAccess;
	}
	
	// Maintenant, peut-être que le jeton a expiré. 
	// Alors, il faut surveiller la valeur de retour et rediriger vers la route de rafraîchissement de jeton.
	
	// On va construire une chaîne de paramètres avec les données du formulaire.
	let formData = new FormData(formTest2);
	// console.log(formData);
	let str = '';
	let compteur = 0;
	for (let [key, prop] of formData)
	{
		if(key == 'Reponse')
		{
			continue;
		}
		if(compteur > 0)
		{
			str+="&";
		}
		str += key+'='+ prop;
		compteur++;
	}
	// console.log(str);
	
	SetXHR(formTest2.method, formTest2.action, (obj)=>
	{
		
		if(obj.status == 401 && jetonAccess != null)
		{
			console.log("On a envoyé un jeton ACCESS mais il est périmé. On demande un nouveau jeton ACCESS.");	
			DemandeNouveauJeton();
			return;
		}
		
		textAreaTest2.textContent = `${obj.status}, ${obj.text}\n${JSON.stringify(obj.reponse, null, 2)}`;
				
	}, null, str, jetonAccess);
}

function DemandeNouveauJeton()
{
	// Obtenir les jeton REFRESH du Local Storage
	const objLS = LocalStorageObtenir();
	
	if(!objLS)
	{
		console.log("Pas de jeton à envoyer !");
		return;
	}
		
	SetXHR('post', 'http://localhost:3000/refresh', (obj)=>
	{
		textAreaTest2.textContent = `${obj.status}, ${obj.text}\n${JSON.stringify(obj.reponse, null, 2)}`;
		// console.log(`${obj.status}, ${obj.text}\n${JSON.stringify(obj.reponse, null, 2)}`);
		
		// Stocker le nouvel objet 
		// console.log(obj.reponse);
		LocalStorageSauvegarder(obj.reponse.access_token, objLS.jetonRefresh);
		
		// Maintenant, amélioration possible : renvoyer le formulaire qui a déclenché cette fonction.
		
	}, null, null, objLS.jetonRefresh);
}


// Formulaire : /login
const formLogin = document.forms['formLogin'];
const textAreaLogin = document.getElementById('textAreaLogin');
formLogin.onsubmit = (e)=>
{
	e.preventDefault();	
	
	// Récupérer les données du formulaire
	let formData = new FormData(formLogin);
	// console.log(formData);
	
	// Node ne sait pas gérer FormData. On va donc construire un objet.
	let obj = {}; 
	// v.1
	// for (const pair of formData.entries()) 
	// {
	// 	if(pair[0] == 'Reponse') // pour enlever si on veut
	// 	{
	// 		continue;
	// 	}
	// 	obj[pair[0]] = pair[1];
	// }
	
	// v.2
	for (let [key, prop] of formData)
	{
		if(key == 'Reponse')
		{
			continue;
		}
		obj[key] = prop;
	}
	// console.log(obj);
	// console.log(JSON.stringify(obj, null, 2));
		
	SetXHR(formLogin.method, formLogin.action, (obj)=>
	{
		textAreaLogin.textContent = `${obj.status}, ${obj.text}\n${JSON.stringify(obj.reponse, null, 2)}`;
		
		// Conservons le jeton en LocalStorage
		LocalStorageSauvegarder(obj.reponse.access_token, obj.reponse.refresh_token)
		
		console.log(obj);
	}, JSON.stringify(obj));

}

// ============================================================================
// Local storage
// ============================================================================

function LocalStorageSauvegarder(access, refresh)
{
	let obj =
	{
		jetonAccess : access,
		jetonRefresh : refresh
	};
	
	localStorage.setItem("jetons", JSON.stringify(obj));
}

function LocalStorageObtenir()
{
	let obj = JSON.parse(localStorage.getItem('jetons'));
	return obj;
}
