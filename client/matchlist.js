var react = require("react");
var User = require("./user");
var PlayerEditor = require("./playereditor");
var NewGameForm = require("./newgameform");

module.exports = class MatchList extends react.Component{
	constructor(){
		super();
		this.user = new User({});
		this.loadGames();
	}
	async loadGames(){
		this.matches = JSON.parse(await (await fetch("/api/matches")).text());
		this.forceUpdate();
	}
	render(){
		return react.createElement("div", {className: "home"},
			react.createElement(PlayerEditor, {user: this.user, updateCallback: this.forceUpdate.bind(this)}),
			react.createElement(NewGameForm, {createGameCallback: this.createGame.bind(this), createBotGameCallback: this.createBotGame.bind(this)}),
			react.createElement("h2",{className: "title games-title"}, "games"),
			react.createElement("div", {className: "game-list"},
				react.createElement("button",{className: "game-refresh", onClick:this.loadGames.bind(this)},"refresh games"),
				(this.matches||[]).map(m=> // loop matches
					react.createElement("div",{className: "join-game", onClick:this.joinGame.bind(this,m.id,this.user.username,this.user.avatar)},
						react.createElement("p", {className: "started-by"}, "Game started by "+m.started_by),
						react.createElement("p",{className: "game-name"}, ""+m.name),
						react.createElement("p",{className: "player-count"},m.players+"/4")
					)
				)
			)
		);
	}

	async createGame(name, points_to_end, moon_bonus_up, moon_bonus_down, pass_order) {
		var id = await (await fetch("/api/matches",{
			method:"POST",
			body: JSON.stringify({
				name: name.value, points_to_end: points_to_end.value,
				moon_bonus_down: moon_bonus_down.value, moon_bonus_up: moon_bonus_up.value,
				pass_order: pass_order.value, started_by: this.user.username
			}),
			headers: {'Content-Type': 'application/json'}
		})).text();

		this.joinGame(id, this.user.username, this.user.avatar);
	}

	/**
	 * Join a game! Should I include the avatar ID? (lainsafe AVIs only, so just the filenames?)
	 *
	 * @param id
	 * @param username
	 * @param avatar
	 * @returns {Promise<void>}
	 */
	async joinGame(id, username, avatar) {
		location = "/matches/"+id+"?username="+username+"&avatar="+avatar;
	}

	async createBotGame() {
		var id = await (await fetch("/api/matches",{method:"POST"})).text(); // make new game
		this.addBot(id, "Alice", "https://lain.wiki/images/8/87/830px-Alice_Layer_01.jpg");
		this.addBot(id, "Reika", "https://lain.wiki/images/1/13/Reika.jpg");
		this.addBot(id, "Julie", "https://rei.animecharactersdatabase.com/uploads/chars/5688-467315309.jpg");
		this.joinGame(id, this.user.username, this,user.avatar);
	}

	async addBot(id, username, avatar) {
		window.open("/matches/"+id+"?bot=true&username="+username);
	}
}
