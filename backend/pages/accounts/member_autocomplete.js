function escape_control(str) {
	str += "";
	str = str.replace(/\\/g, "\\\\");
	str = str.replace(/%/g, "\\%");
	str = str.replace(/_/g, "\\_");
	return str;
}

var timeouts = {};

module.exports.GET = async function(req, serve, vars, evars) {
	var query_data = evars.query_data;
	var user = evars.user;

	var db = vars.db;
	var uvias = vars.uvias;
	var accountSystem = vars.accountSystem;

	var input = query_data.q;

	if(!input) input = "";
	input += "";
	input = input.trim();
	if(!input && !user.superuser) return serve("");
	if(input.length < 4 && !user.superuser) return serve("");
	if(timeouts[evars.ipAddress] > Date.now() && !user.superuser) return serve("Exceeded rate limit, wait five more seconds.");
	
	if(timeouts[evars.ipAddress] < Date.now()) delete timeouts[evars.ipAddress];
	
	var limit = 10;
	if(user.superuser) limit = Number.MAX_SAFE_INTEGER;

	var list;
	if(accountSystem == "uvias") {
		list = await uvias.all("SELECT username FROM accounts.users WHERE username ILIKE $1::text || '%' ESCAPE '\\' ORDER BY username LIMIT ?", [escape_control(input), limit]);
	} else if(accountSystem == "local") {
		list = await db.all("SELECT username FROM auth_user WHERE username LIKE ? || '%' ESCAPE '\\' ORDER BY username LIMIT ?", [escape_control(input), limit]);
	}

	var users = [];
	for(var i = 0; i < list.length; i++){
		users.push(list[i].username);
	}
	serve(users.join("\n"));
	
	if(!user.superuser) timeouts[evars.ipAddress] = Date.now()+5000;
}