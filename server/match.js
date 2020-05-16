var EventEmitter = require("events").EventEmitter;
var allCards = require("./cards");

var beginningCard = allCards.filter(c=>c.color=="club"&&c.kind=="2")[0];

module.exports = class Match extends EventEmitter{
	constructor(){
		super();
		this.cards = allCards.slice();
		this.players = [
			{},
			{},
			{},
			{}
		];
		this.games = [];
		this.deal();
	}
	deal(){
		var cards = this.cards.slice(0);
		var shuffledCards = [];
		while(cards.length){
			shuffledCards.push(cards.splice(Math.floor(Math.random()*cards.length),1)[0]);
		}
		for(var i = 0; i < this.players.length; i++){
			this.players[i].cards = shuffledCards.slice(i*13,i*13+13);
			this.players[i].wonCards = [];
		}
		this.currentGame = {rounds:[]};
		this.games.push(this.currentGame);
		if(this.games.length%this.players.length){
			this.stage = "playing";
			this.currentGame.rounds.push(this.currentRound = {startedBy:this.findGameStarter(),cards:[],wonBy:null})
		}else{
			this.stage = "passing";
		}

		for(var player of this.players){
			this.notifyPlayer(player,{
				event:"newGame",
				cards:player.cards,
				startedBy: this.stage=="playing"?this.currentRound.startedBy:undefined
			});
		}
	}
	passCards(player,cards){
		if(this.stage != "passing") throw new Error("game is not in passing stage");
		if(this.players[player].passedCards) throw new Error("player already has passed cards for this round");
		if(cards.length != 3) throw new Error("must pass exactly 3 cards");

		for(var card of cards){
			if(!this.players[player].cards.includes(card)) throw new Error("cannot pass not owned cards");
			if(cards.filter(c=>c==card).length !== 1) throw new Error("cannot pass the same card twice");
		}

		this.players[player].passedCards = cards;

		if(this.players.filter(p=>p.passedCards).length == this.players.length){
			var offset = this.games.length%this.players.length;
			for(var i = 0; i < this.players.length; i++){
				var passingPlayer = this.players[i];
				var receivingPlayer = this.players[(i+offset)%this.players.length];
				for(var card of passingPlayer.passedCards){
					passingPlayer.cards.splice(passingPlayer.cards.indexOf(card),1);
					receivingPlayer.cards.push(card);
				}
				delete passingPlayer.passedCards;
			}

			this.currentRound = {
				startedBy:this.findGameStarter(),
				cards:[],
				wonBy:null
			}
			this.currentGame.rounds.push(this.currentRound);

			this.stage = "playing";

			for(var player of this.players){
				this.notifyPlayer(player,{
					event:"exchangedCards",
					cards:player.cards,
					startedBy:this.currentRound.startedBy
				})
			}
		}
	}
	playCard(player,card){
		if(this.stage != "playing") throw new Error("Sorry we're taking a break - can we wait a few minutes?");
		if(player != (this.currentRound.startedBy+this.currentRound.cards.length)%this.players.length) throw new Error("Hey buddy its not your turn");
		if(!this.players[player].cards.includes(card)) throw new Error("That's uh... not your card..");

		var isFirstRoundOfGame = this.currentGame.rounds.length === 1;
		var isFirstCardOfRound = !this.currentRound.cards.length;
		var isHeartsBroken = this.currentGame.rounds.map(r=>r.cards.map(c=>c.color=="heart").reduce((a,b)=>a||b,false)).reduce((a,b)=>a||b,false);

		if(isFirstRoundOfGame && (card.color == "heart" || (card.color == "spade" && card.kind == "queen"))) throw new Error("Sorry - can't break hearts on the first round (yes that includes the queen)");
		if(isFirstCardOfRound){
			if(isFirstRoundOfGame && card != beginningCard) throw new Error("It's the first round and you you have the Two of Clubs - you have to play it!");
		 	if(!isHeartsBroken && card.color=="heart" && this.players[player].cards.filter(c=>c.color=="heart").length != this.players[player].cards.length) throw new Error("Can't lead with");
		}else{
			if(card.color != this.currentRound.cards[0].color && this.players[player].cards.filter(c=>c.color==this.currentRound.cards[0].color).length) throw new Error("must play same color");
		}

		this.currentRound.cards.push(card);
		this.players[player].cards.splice(this.players[player].cards.indexOf(card),1);

		this.notifyPlayers({
			event:"playedCard",
			card:card
		});

		if(this.currentRound.cards.length == this.players.length){
			var startColor = this.currentRound.cards[0].color;
			var highest = 0;
			for(var i = 1; i < this.currentRound.cards.length; i++){
				if(this.currentRound.cards[i].color == startColor && allCards.kinds.indexOf(this.currentRound.cards[i].kind) > allCards.kinds.indexOf(this.currentRound.cards[highest].kind)) highest = i;
			}
			this.currentRound.wonBy = (this.currentRound.startedBy+highest)%this.players.length;

			if(this.players.map(p=>p.cards.length).reduce((a,b)=>a+b,0) === 0){
				var playerPoints = this.players.map((p,i)=>
					this.games.map(g=>{
						var playerPoints = this.players.map((p,i)=>
							g.rounds.filter(r=>r.wonBy==i).map(r=>
								r.cards.map(c=>c.color=="heart"?1:((c.color=="spade"&&c.kind=="queen")?13:0)).reduce((a,b)=>a+b,0)
							).reduce((a,b)=>a+b,0)
						);
						var victoryPlayer = playerPoints.indexOf(26);
						return victoryPlayer < 0?playerPoints[i]:(victoryPlayer==i?0:26);
					}).reduce((a,b)=>a+b,0)
				)
				if(!playerPoints.filter(p=>p>=100).length){
					this.deal();
				}else{
					this.stage = "over";
					this.notifyPlayers({
						event:"matchOver"
					})
				}
			}else{
				this.currentRound = {
					startedBy:this.currentRound.wonBy,
					cards:[],
					wonBy:null
				};
				this.currentGame.rounds.push(this.currentRound);
			}
		}
	}

	takeSeat(connection){
		connection.once("message",msg=>{
			msg = JSON.parse(msg);
			if(msg.action != "takeSeat"){
				connection.send(JSON.stringify({event:"error",message:"must take seat at first"}));
				connection.close();
			}
			if(typeof msg.username != "string" || msg.username.length < 1 || msg.username.length > 50){
				connection.send(JSON.stringify({event:"error",message:"username must be a string of length 1-50"}));
				connection.close();
			}
			var seat = this.players.findIndex(p=>!p.connection);
			if(seat < 0){
				connection.send(JSON.stringify({event:"error",message:"game is full"}));
				connection.close();
				return;
			}

			// this is probably how we can add bots
			this.players[seat].username = msg.username;
			this.notifyPlayers({
				event:"seatTaken",
				seat:seat,
				username:msg.username
			});
			this.players[seat].connection = connection;
			connection.on("close",()=>{
				delete this.players[seat].connection;
				delete this.players[seat].username;
				this.notifyPlayers({
					event:"seatLeft",
					seat:seat
				});
				if(!this.players.filter(p=>p.connection).length) this.emit("close");
			})
			connection.on("message",msg=>{
				try{
					msg = JSON.parse(msg);
					switch(msg.action){
						case "passCards":
							if(!(msg.cards instanceof Array)) throw new Error("cards must be an array");
							this.passCards(seat,msg.cards.map(this.mapCard.bind(this)));
							break;
						case "playCard":
							this.playCard(seat,this.mapCard(msg.card));
							break;
						default:
							throw new Error("unknown action");
					}
				}catch(e){
					connection.send(JSON.stringify({event:"error",message:e.message}));
				}
			})
			this.notifyPlayer(this.players[seat],{
				event:"init",
				seat:seat,
				stage:this.stage,
				cards:this.players[seat].cards,
				games:this.games,
				players:this.players.length,
				usernames:this.players.map(u=>u.username)
			});
		});
	}

	mapCard(card){
		if(typeof card != "object") throw new Error("card must be an object");
		card = this.cards.filter(c=>c.color==card.color&&c.kind==card.kind)[0];
		if(!card) throw new Error("card does not exist");
		return card;
	}

	findGameStarter(){
		for(var i = 0; i < this.players.length; i++){
			if(this.players[i].cards.filter(c=>c==beginningCard).length) return i;
		}
	}

	notifyPlayers(event){
		for(var player of this.players){
			this.notifyPlayer(player,event);
		}
	}
	notifyPlayer(player,event){
		if(player.connection){
			player.connection.send(JSON.stringify(event));
		}
	}
}
