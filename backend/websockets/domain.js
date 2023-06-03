module.exports = async function(ws, data, send, vars, evars) {
	var domain = data.domain;
	
	if(ws.sdata.domain && ws.sdata.domain !== domain) { //preexisting
		ws.send(JSON.stringify({
			kind: "domainCheck",
			domain: domain
		}));
	}
	
	ws.sdata.domain = domain;
}