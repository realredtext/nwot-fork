function validIP(ip, fam) {
    ip = ip.toLowerCase();
    if(![4, 6].includes(fam)) return false;

    if(ip.length < 7) return false;

    if(fam === 4) {
        if(ip.split(".").length < 4) return false;
        if((ip.split(".").map(Number).filter(e => e > 255 || e < 0)).length) return false;

        return !(/[^1234567890\.\/]/g.test(ip));
    } else {
        if(ip.split(":").length < 8) return false;
        if(ip.split(":").map(e => parseInt(e, 16)).filter(e => e > 0xffff || e < 0).length) return false;

        return !(/[^1234567890abcdef\:\/]/gim.test(ip));
    };
};

module.exports.GET = async function(req, serve, vars, evars, params) {
	var HTML = evars.HTML;
	var user = evars.user;
	
	var dispage = vars.dispage;
	var blocked_ip_list = vars.blocked_ip_list;
	
	if(!user.superuser) {
		return await dispage("404", null, req, serve, vars, evars);
	};
	
	serve(HTML("administrator_ip_restrictions.html", {
		block_message: params.block_message,
		unblock_message: params.unblock_message,
		restr_array: Object.keys(blocked_ip_list),
		csrftoken: evars.cookies.csrftoken
	}));
}

module.exports.POST = async function(req, serve, vars, evars) {
	var post_data = evars.post_data;
	var user = evars.user;
	var csrftoken = evars.cookies.csrftoken;
	
	var dispage = vars.dispage;
	var blockIPAddress = vars.blockIPAddress;
	var unblockIPAddress = vars.unblockIPAddress;
	var blocked_ip_list = vars.blocked_ip_list;
	
	if(!user.superuser) return;
	
	var postedCSRFtoken = post_data.csrfmiddlewaretoken;
	if(postedCSRFtoken !== evars.cookies.csrftoken) return;
	
	var post_type = post_data.post_type;
	var ip_addr = post_data.ip_addr;
	var ipFam = ip_addr.includes(":")?6:4;
	
	if(post_type === "block_ip") {
		var reason = post_data.reason || "none given";
		if(!ip_addr) return await dispage("admin/ip_restrictions", {
			block_message: "No IP given",
			csrftoken: evars.cookies.csrftoken
		}, req, serve, vars, evars);
		
		if(!validIP(ip_addr, ipFam)) return await dispage("admin/ip_restrictions", {
			block_message: "Invalid IP address",
			csrftoken: evars.cookies.csrftoken
		}, req, serve, vars, evars);
		
		if(ip_addr === evars.ipAddress) return await dispage("admin/ip_restrictions", {
			block_message: "You can not block your IP",
			csrftoken: evars.cookies.csrftoken
		}, req, serve, vars, evars);
		
		var worlds = post_data.worlds_stringified;
		if(!worlds) worlds = "*";
		
		if(worlds !== "*") { try {
				worlds = JSON.parse(worlds);
			} catch(e) {
				return await dispage("admin/ip_restrictions", {
					block_message: "Invalid world list",
					csrftoken: evars.cookies.csrftoken
				}, req, serve, vars, evars);
			};
		};
		
		blockIPAddress(ip_addr, reason, worlds);
		return await dispage("admin/ip_restrictions", {
			block_message: "Blocked IP "+ip_addr,
			csrftoken: evars.cookies.csrftoken
		}, req, serve, vars, evars);
	} else {
		if(!ip_addr) return await dispage("admin/ip_restrictions", {
			unblock_message: "No IP given",
			csrftoken: evars.cookies.csrftoken
		}, req, serve, vars, evars);
		
		if(!blocked_ip_list[ip_addr+""]) return await dispage("admin/ip_restrictions", {
			unblock_message: "This IP is not blocked",
			csrftoken: evars.cookies.csrftoken
		}, req, serve, vars, evars);
		
		unblockIPAddress(ip_addr);
		return await dispage("admin/ip_restrictions", {
			unblock_message: "Un-blocked IP " + ip_addr
		}, req, serve, vars, evars);
	};
}