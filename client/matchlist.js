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
				react.createElement("tbody",{}, (this.matches||[]).map(m=>
					react.createElement("tr",{onClick:this.joinGame.bind(this,m.id)},
						react.createElement("td",{},m.players+"/4"),
						react.createElement("td",{},m.game+"")
					)
				))
			),
			react.createElement("div",{className:"float-right"},
				react.createElement("button",{className:"btn btn-primary",onClick:this.loadGames.bind(this)},"refresh"),
				react.createElement("button",{className:"btn btn-primary ml-1",onClick:this.createGame.bind(this)},"new game")
			)
		)
	}
	async createGame(){
		var id = await (await fetch("/api/matches",{method:"POST"})).text();
		this.joinGame(id);
	}
	async joinGame(id){
		location = "/matches/"+id;
	}
}
