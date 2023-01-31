module.exports.GET = async function(req, serve, vars, evars, params) {
	var HTML = evars.HTML;
	var user = evars.user;

	var dispage = vars.dispage;
	var db = vars.db;

	// not staff
	if(!user.staff) {
		return await dispage("404", null, req, serve, vars, evars);
	}

	var scripts = [];

	var scriptsForUser = await db.all("SELECT * FROM scripts WHERE owner_id=?", user.id);
	
	for(var i in scriptsForUser) {
		let script = scriptsForUser[i];
		scripts.push({
			name: script.name,
			enabled: script.enabled
		})
	};

	var data = {
		scripts
	}
	if(params.creation_message) data.creation_message = params.creation_message;
	if(params.deletion_message) data.deletion_message = params.deletion_message;

	serve(HTML("script_manager.html", data));
}

module.exports.POST = async function(req, serve, vars, evars) {
	var post_data = evars.post_data;
	var user = evars.user;

	var db = vars.db;
	var dispage = vars.dispage;

	if(!user.staff) {
		return;
	}
	if("scriptname" in post_data && post_data.scriptname.length > 0) {
		var name = post_data.scriptname;
		if(name == "") return;

		var exists = await db.get("SELECT * FROM scripts WHERE owner_id=? AND name=?", [user.id, name])

		if(exists) {
			return await dispage("script_manager", {
				creation_message: "The script already exists"
			}, req, serve, vars, evars);
		}

		await db.run("INSERT INTO scripts VALUES(null, ?, ?, '', ?, 0)", [user.id, name, Date.now()])

		await dispage("script_manager", {
			creation_message: "Script created successfully"
		}, req, serve, vars, evars);
	}
	
	if("specifiedscript" in post_data && post_data.specifiedscript.length > 0) {
		var scriptToRemove = post_data.specifiedscript;
		if(!user.superuser) return;
		
		var exists = await db.get("SELECT * FROM scripts WHERE owner_id=? AND name=?", [user.id, scriptToRemove]);
		
		if(!exists) {
			return await dispage("script_manager", {
				deletion_message: "The script \""+scriptToRemove+"\" does not exist."
			}, req, serve, vars, evars);
		} else {
			await db.run("DELETE FROM scripts WHERE owner_id=? AND name=?", [user.id, scriptToRemove]);
			
			return await dispage("script_manager", {
				deletion_message: "Script \""+scriptToRemove+"\" has been deleted."
			}, req, serve, vars, evars)
		}
				
	}
}