var react = require("react");

module.exports = class MatchList extends react.Component{
	constructor(){
		super();
		this.loadGames();
	}
	async loadGames(){
		this.matches = JSON.parse(await (await fetch("/api/matches")).text());
		this.forceUpdate();
	}
	render(){
		return react.createElement("div",{className:"container"},
			react.createElement("h1",{className:"lain-title"},"open hearts"),
			react.createElement("div",{className:"form-group row"},
				react.createElement("label",{className:"col-form-label col-sm-4"},"username"),
				react.createElement("div",{className:"col-sm-8"},
					react.createElement("input",{className:"form-control",value:localStorage["username"]||"lain",onChange:v=>{localStorage["username"] = v.target.value;this.forceUpdate();}})
				)
			),
			react.createElement("h2",{},"match list"),
			react.createElement("table",{className:"table table-striped table-hover"},
				react.createElement("thead",{},
					react.createElement("tr",{},
						react.createElement("th",{},"player count"),
						react.createElement("th",{},"game #")
					)
				),
				react.createElement("tbody",{}, (this.matches||[]).map(m=> // loop matches
					react.createElement("tr",{onClick:this.joinGame.bind(this,m.id)},
						react.createElement("td",{},m.players+"/4"),
						react.createElement("td",{},m.game+"")
					)
				))
			),
			react.createElement("div",{className:"float-right"},
				react.createElement("button",{className:"btn btn-primary",onClick:this.loadGames.bind(this)},"refresh"),
				react.createElement("button",{className:"btn btn-primary ml-1",onClick:this.createGame.bind(this)},"new game")
			),
			react.createElement("button", {className:"match-control",onClick:this.createBotGame.bind(this)}, "create bot game")
		)
	}
	async createGame() {
		var id = await (await fetch("/api/matches",{method:"POST"})).text();
		this.joinGame(id, localStorage["username"]||"Lain");
	}

	async joinGame(id, username) {
		location = "/matches/"+id+"?username="+username;
	}

	async createBotGame() {
		var id = await (await fetch("/api/matches",{method:"POST"})).text(); // make new game
		this.addBot(id, "Alice");
		this.addBot(id, "Reika");
		this.addBot(id, "Julie");
		this.joinGame(id, localStorage["username"]||"lain");
	}

	async addBot(id, username) {
		window.open("/matches/"+id+"?bot=true&username="+username);
	}
}
