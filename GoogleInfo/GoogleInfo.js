var token;
var interval = 100;		// msec
var repeat = 50;		// n x interval = timeout ... 50 x 100 = 5000 msec de timeout ...
var cnt = 0;
var cpt_initial;

exports.init = function () {
    info('[ GoogleInfo ] is initializing ...');
}

exports.action = function(data, callback){

	config = Config.modules.GoogleInfo;

	cpt_initial = SARAH.context.SpeechReco.compteur;
	cnt = 0;
	token = setInterval(function() {
		checkSpeechReco(SARAH, callback)
	}, interval);
}

function checkSpeechReco(SARAH, callback) {
	var new_cpt = SARAH.context.SpeechReco.compteur;

	if (new_cpt != cpt_initial) {

		var search = SARAH.context.SpeechReco.lastReco;
		console.log ("Search: " + search);

		var rgxp = /(donne moi des informations sur|donne moi des infos sur|tu peux me donner des informations sur|tu peux me donner des infos sur|que sait tu sur|que sais tu sur|tu sait quoi sur|tu sais quoi sur) (.+)/i;

		var match = search.match(rgxp);
		if (!match || match.length <= 1){
			console.log("FAIL");
			clearInterval(token);
			return callback({'tts': "Je ne comprends pas"});
		}

		search = match[2];
		clearInterval(token);
		console.log("Cnt: " + cnt);
		return infogoogle(search, callback);
	} else {
		cnt+= interval;
		if (cnt > (interval * repeat)) {
			clearInterval(token);
			return callback ({'tts': "Google Chrome n'a pas répondu assez vite"});
		}
	}
}

function infogoogle(search, callback) {
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
			clearInterval(token);
			callback({'tts': "L'action a échoué"});
			return;
	    }
        var $ = cheerio.load(html);

        var infos = $('.g ._o0d ._tXc span').text().trim().replace('Wikipédia', '');

        if(infos == "") {
        	console.log("Impossible de récupérer les informations sur Google");

        	callback({'tts': "Désolé, je n'ai pas réussi à récupérer d'informations" });
        } else {
        	console.log("Informations: " + infos);

        	callback({'tts': infos });
        }
	    return;
    });
}