module.exports.GET = async function(req, serve, vars, evars, params) {
	var HTML = evars.HTML;
	var user = evars.user;
	
	var dispage = vars.dispage;
	var blocked_phrase_list = vars.blocked_phrase_list;
	if(blocked_phrase_list.length === 1 && blocked_phrase_list[0] === "") blocked_phrase_list = [];
	
	if(!user.superuser) {
		return await dispage("404", null, req, serve, vars, evars);
	}
	
	serve(HTML("administrator_chat_filter.html", {
		message: params.message,
		phrase_list: blocked_phrase_list.join("\n")
	}))
}

module.exports.POST = async function(req, serve, vars, evars) {
	var post_data = evars.post_data;
	var user = evars.user;
	
	if(!user.superuser) return;
	
	var dispage = vars.dispage;
	var blocked_phrase_list = vars.blocked_phrase_list;
	var setBlockedPhrases = vars.setBlockedPhrases;
	
	var subm_list = post_data.subm_list;
	var postedCSRFToken = post_data.csrfmiddlewaretoken;
	
	if(postedCSRFToken !== evars.cookies.csrftoken) return;
	
	if(!subm_list) {
		setBlockedPhrases([""]);
		return await dispage("admin/chat_filter", {
			message: "Unblocked all phrases",
			phrase_list: blocked_phrase_list.join("\n")
		}, req, serve, vars, evars);
	} else {
		setBlockedPhrases(subm_list.split("\n"));
		return await dispage("admin/chat_filter", {
			message: "Successfully set list",
			phrase_list: blocked_phrase_list.join("\n")
		}, req, serve, vars, evars);
	}
}