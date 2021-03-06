var EventEmitter = require("events").EventEmitter;
var allCards = require("../server/cards");

module.exports = class HeartsClient extends EventEmitter{
	constructor(id, username, avatar){
		super();
		this.connected = false;
		this.connection = new WebSocket((location.protocol==="https:"?"wss":"ws")+"://"+location.host+"/api/matches/"+id); // socket is ID indexed by game
		this.delay = Promise.resolve(true);
		this.connection.onopen = ()=>{
			this.connection.send(JSON.stringify({action:"takeSeat",username:username, avatar: avatar})); // when the client constructs it sends the takeSeat event with username
		}
		this.connection.onmessage = async msg=>{ // listen for message from server
			await this.delay;
			var data = JSON.parse(msg.data);
			switch(data.event){
				case "init":
					this.connected = true;
					this.seat = data.seat;
					this.stage = data.stage;
					this.players = data.players;
					this.usernames = data.usernames;
					this.avatars = data.avatars;
					this.cards = data.cards;
					this.games = data.games;
					this.currentGame = this.games[this.games.length-1];
					this.currentRound = this.currentGame.rounds[this.currentGame.rounds.length-1];
					this.emit("change");
					break;
				case "newGame":
					console.log("Starting a new game..", data);
					this.cards = data.cards;
					this.games.push(this.currentGame = {
						rounds:[]
					})
					this.stage = data.stage;
					if (this.stage === 'playing') {
						this.currentGame.rounds.push(this.currentRound = {staredBy:data.startedBy,cards:[],wonBy:null});
					} // else?? passing?
					this.emit("change");
					break;
				case "exchangedCards":
					this.cards = data.cards;
					this.stage = "playing";
					this.currentGame.rounds.push(this.currentRound = {
						startedBy:data.startedBy,cards:[],wonBy:null
					});
					this.emit("change");
					break;
				case "heartsBroken":
					this.currentGame.heartsBroken = true;
					break;
				case "playedCard":
					this.currentRound.cards.push(data.card);
					var index = this.cards.findIndex(c=>c.color===data.card.color&&c.kind===data.card.kind);
					if (index >= 0) {
						this.cards.splice(index, 1);
					}
					if(this.currentRound.cards.length === this.players){ // also handle trick?
						this.delay = new Promise(s=>setTimeout(s,1000));
						this.emit("change");
						await this.delay;

						var startColor = this.currentRound.cards[0].color;
						var highest = 0;
						for(var i = 1; i < this.currentRound.cards.length; i++){
							if(this.currentRound.cards[i].color === startColor && allCards.kinds.indexOf(this.currentRound.cards[i].kind) > allCards.kinds.indexOf(this.currentRound.cards[highest].kind)) highest = i;
						}

						this.currentRound.wonBy = (this.currentRound.startedBy+highest)%this.players;
						if(!this.cards.length){
							var playerPoints = this.calculatePoints(this.games);
							if(!playerPoints.filter(p=>p>=100).length){
								// game is still on
							} else {
								this.stage = "over"; // its done wow! start a new one., or, restart lobby?
							}
						} else {
							this.currentGame.rounds.push(this.currentRound = {
								startedBy:this.currentRound.wonBy,
								cards:[],
								wonBy:null
							});
						}
					}
					this.emit("change");
					break;
				case "seatTaken":
					this.usernames[data.seat] = data.username;
					this.avatars[data.seat] = data.avatar;
					this.emit("change");
					break;
				case "seatLeft":
					this.usernames[data.seat] = null;
					this.avatars[data.seat] = null;
					this.emit("change");
					break;
				case "error": // probably set error status = true, msg = data.message, forceUpdate, render, close on 'x', forceUpdate
					alert(data.message);
					break;
			}
		}
		this.connection.onclose = ()=>{
			this.connected = false;
			this.emit("change");
		}
	}

	passCards(cards){
		this.connection.send(JSON.stringify({action:"passCards",cards}));
	}

	playCard(card){
		this.connection.send(JSON.stringify({action:"playCard",card}));
	}

	calculatePoints(games){
		var players = new Array(this.players).fill(0);
		return players.map((p,i)=>
			games.map(g=>{
				var playerPoints = players.map((p,i)=>
					g.rounds.filter(r=>r.wonBy===i).map(r=>
						r.cards.map(c=>c.color==="heart"?1:((c.color==="spade"&&c.kind==="queen")?13:0)).reduce((a,b)=>a+b,0)
					).reduce((a,b)=>a+b,0)
				);
				var victoryPlayer = playerPoints.indexOf(26);
				return victoryPlayer < 0?playerPoints[i]:(victoryPlayer===i?0:26);
			}).reduce((a,b)=>a+b,0)
		)
	}

	isActive(seat_index) {
		return seat_index === (this.currentRound && (this.currentRound.startedBy+this.currentRound.cards.length)%this.players) && this.stage === "playing";
	}
}
