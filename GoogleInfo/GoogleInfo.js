var ScribeSpeak;
var token;
var TIME_ELAPSED;
var FULL_RECO;
var PARTIAL_RECO;
var TIMEOUT_SEC = 10000;

exports.init = function () {
    info('[ GoogleInfo ] is initializing ...');
}

exports.action = function(data, callback){
	
	ScribeSpeak = SARAH.ScribeSpeak;

	FULL_RECO = SARAH.context.scribe.FULL_RECO;
	PARTIAL_RECO = SARAH.context.scribe.PARTIAL_RECO;
	TIME_ELAPSED = SARAH.context.scribe.TIME_ELAPSED;

	SARAH.context.scribe.activePlugin('GoogleInfo');

	var util = require('util');
	console.log("GoogleInfo call log: " + util.inspect(data, { showHidden: true, depth: null }));

	SARAH.context.scribe.hook = function(event) {
		checkScribe(event, data.action, callback); 
	};
	
	token = setTimeout(function(){
		SARAH.context.scribe.hook("TIME_ELAPSED");
	}, TIMEOUT_SEC);

}

function checkScribe(event, action, callback) {

	if (event == FULL_RECO) {
		clearTimeout(token);
		SARAH.context.scribe.hook = undefined;
		// aurait-on trouvé ?
		decodeScribe(SARAH.context.scribe.lastReco, callback);

	} else if(event == TIME_ELAPSED) {
		// timeout !
		SARAH.context.scribe.hook = undefined;
		// aurait-on compris autre chose ?
		if (SARAH.context.scribe.lastPartialConfidence >= 0.7 && SARAH.context.scribe.compteurPartial > SARAH.context.scribe.compteur) {
			decodeScribe(SARAH.context.scribe.lastPartial, callback);
		} else {
			SARAH.context.scribe.activePlugin('Aucun (GoogleInfo)');
			ScribeSpeak("Désolé je n'ai pas compris. Merci de réessayer.", true);
			return callback();
		}
		
	} else {
		// pas traité
	}
}

function decodeScribe(search, callback) {

	console.log ("Search: " + search);
	var rgxp = /(informations sur|infos sur|tu sur|quoi sur) (.+)/i;

	var match = search.match(rgxp);
	if (!match || match.length <= 1){
		SARAH.context.scribe.activePlugin('Aucun (GoogleInfo)');
		ScribeSpeak("Désolé je n'ai pas compris.", true);
		return callback();
	}

	search = match[2];
	return infogoogle(search, callback);
}

function infogoogle(search, callback) {

	var fs = require("fs");
	var path = require('path');
 	var filePath = __dirname + "/SaveInfos.json";
	var file_content;

	file_content = fs.readFileSync(filePath, 'utf8');
	file_content = JSON.parse(file_content);

	if(typeof file_content[search] != 'undefined' && file_content[search] != "") {
		var infos = file_content[search];
		console.log("Informations: " + infos);
		ScribeSpeak(infos);
		callback();
		return;

	} else {

		var url = "https://www.google.fr/search?q=" + encodeURI(search) + "&btnG=Rechercher&gbv=1";
		console.log('Url Request: ' + url);

		var request = require('request');
		var cheerio = require('cheerio');

		var options = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
			'Accept-Charset': 'utf-8'
		};
		
		request({ 'uri': url, 'headers': options }, function(error, response, html) {

	    	if (error || response.statusCode != 200) {
				ScribeSpeak("La requête vers Google a échoué. Erreur " + response.statusCode);
				callback();
				return;
		    }
	        var $ = cheerio.load(html);

	        var infos = $('.g ._o0d ._tXc span').text().trim().replace('Wikipédia', '');

	        if(infos == "") {
	        	console.log("Impossible de récupérer les informations sur Google");
	        	ScribeSpeak("Désolé, je n'ai pas réussi à récupérer d'informations", true);
	        	callback();
	        } else {
	        	file_content[search] = infos;
	        	chaine = JSON.stringify(file_content, null, '\t');
				fs.writeFile(filePath, chaine, function (err) {
					console.log("[ GoogleInfo ] Informations enregistrés");
				});

	        	console.log("Informations: " + infos);
	        	ScribeSpeak(infos);
	        	callback();
	        }
		    return;
	    });
	}
}