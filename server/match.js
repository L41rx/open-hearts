var EventEmitter = require("events").EventEmitter;
var allCards = require("./cards");
var Bot = require("../client/bot");

var beginningCard = allCards.filter(c=>c.color==="club"&&c.kind==="2")[0];

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
		this.stage = null;
		this.passDirection = null;
		this.deal();
	}

	deal(){
		this.currentRound = null;
		var cards = this.cards.slice(0);
		var shuffledCards = [];
		while(cards.length){
			shuffledCards.push(cards.splice(Math.floor(Math.random()*cards.length),1)[0]);
		}
		for(var i = 0; i < this.players.length; i++){
			this.players[i].cards = shuffledCards.slice(i*13,i*13+13);
			this.players[i].wonCards = [];
		}
		this.currentGame = {rounds:[], heartsBroken: false};
		this.games.push(this.currentGame);
		if (this.games.length % this.players.length === 1) {	// go straight to playing on first round
			this.stage = "playing"; // if it playing, push a new trick onto the stack (who goes first? left of dealer...)
			this.currentGame.rounds.push(this.currentRound = {startedBy:this.findGameStarter(),cards:[],wonBy:null})
			this.passDirection = null;
		} else { // otherwise do some passing first
			this.stage = "passing";
			switch (this.games.length % this.players.length) {
				case 2: this.passDirection = "left"; break;
				case 3: this.passDirection = "right"; break;
				case 0: this.passDirection = "across"; break;
			}
		}

		for (var player of this.players) { // tell everyone we started a new game
			this.notifyPlayer(player,{
				event: "newGame",
				cards: player.cards,
				startedBy: this.stage === "playing" && this.currentRound !== null ? this.currentRound.startedBy : undefined, // a.k.a. newgame lets us know if its started or not? (??) weird if passing.
				stage: this.stage	// also pass the stage because why not?
			});
		}
	}

	passCards(player,cards){
		if(this.stage !== "passing") throw new Error("Why are you passing cards when you should be " + this.stage);
		if(this.players[player].passedCards) throw new Error("You already picked your cards - wait for everyone to finish up");
		if(cards.length !== 3) throw new Error("must pass exactly 3 cards");

		for(var card of cards){
			if(!this.players[player].cards.includes(card)) throw new Error("cannot pass not owned cards");
			if(cards.filter(c=>c==card).length !== 1) throw new Error("cannot pass the same card twice");
		}

		this.players[player].passedCards = cards;

		if(this.players.filter(p=>p.passedCards).length === this.players.length){ // TODO PASS to the right person
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

			for (var player of this.players){
				this.notifyPlayer(player,{
					event:"exchangedCards",
					cards:player.cards,
					startedBy:this.currentRound.startedBy
				})
			}
		}
	}

	isHeartsBroken() {
		return this.currentGame.rounds.map(r=>r.cards.map(c=>c.color==="heart").reduce((a,b)=>a||b,false)).reduce((a,b)=>a||b,false);
	}

	breakHearts() {
		this.currentGame.heartsBroken = true;
		this.notifyPlayers({event:"heartsBroken"});
	}

	playCard(player,card){
		if(this.stage !== "playing") throw new Error("Sorry we're taking a break - can we wait a few minutes?");
		if (!this.isPlayersTurn(player)) throw new Error("Hey buddy its not your turn");
		if(!this.players[player].cards.includes(card)) throw new Error("That's uh... not your card..");

		var isFirstRoundOfGame = this.currentGame.rounds.length === 1;
		var isFirstCardOfRound = !this.currentRound.cards.length;
		if (!this.currentGame.heartsBroken && this.isHeartsBroken())
			this.breakHearts();

		if (isFirstRoundOfGame && (card.color === "heart" || (card.color === "spade" && card.kind === "queen"))) throw new Error("Sorry - can't break hearts on the first round (yes that includes the queen)");
		if (isFirstCardOfRound) {
			if (isFirstRoundOfGame && card !== beginningCard) throw new Error("It's the first round and you you have the Two of Clubs - you have to play it!");
		 	if (!this.currentGame.heartsBroken && card.color === "heart" && this.players[player].cards.filter(c=>c.color==="heart").length !== this.players[player].cards.length) throw new Error("Can't lead with hearts if they're not broken and you've got other options!");
		} else {
			if(card.color !== this.currentRound.cards[0].color && this.players[player].cards.filter(c=>c.color===this.currentRound.cards[0].color).length) throw new Error("You have to follow the led suit, which is "+this.currentRound.cards[0].color+"s right now.");
		}

		this.currentRound.cards.push(card); 											// put the card on the board
		this.players[player].cards.splice(this.players[player].cards.indexOf(card),1); 	// take it out of the playrs cards

		this.notifyPlayers({
			event:"playedCard",
			card:card
		});

		if(this.currentRound.cards.length === this.players.length) { // handle trick summary
			var startColor = this.currentRound.cards[0].color;
			var highest = 0;
			for(var i = 1; i < this.currentRound.cards.length; i++){
				if(this.currentRound.cards[i].color === startColor && allCards.kinds.indexOf(this.currentRound.cards[i].kind) > allCards.kinds.indexOf(this.currentRound.cards[highest].kind)) highest = i;
			}
			this.currentRound.wonBy = (this.currentRound.startedBy+highest)%this.players.length;

			if(this.players.map(p=>p.cards.length).reduce((a,b)=>a+b,0) === 0){ // ??? magic
				var playerPoints = this.players.map((p,i)=>
					this.games.map(g=>{
						var playerPoints = this.players.map((p,i)=>
							g.rounds.filter(r=>r.wonBy===i).map(r=>
								r.cards.map(c=>c.color==="heart"?1:((c.color==="spade"&&c.kind==="queen")?13:0)).reduce((a,b)=>a+b,0)
							).reduce((a,b)=>a+b,0)
						);
						var victoryPlayer = playerPoints.indexOf(26);
						return victoryPlayer < 0?playerPoints[i]:(victoryPlayer===i?0:26);
					}).reduce((a,b)=>a+b,0)
				)

				if (!playerPoints.filter(p=>p>=100).length) { // if the game is not over deal a new game
					this.deal();
				} else {
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

	// An API ping hits this to let the server know somebody is about to connect.
	takeSeat(connection){
		connection.once("message",msg=>{ // listen for one message...? https://stackoverflow.com/a/57071992/13400450
			msg = JSON.parse(msg);
			if(msg.action !== "takeSeat"){
				connection.send(JSON.stringify({event:"error",message:"Welcome to the game. Maybe take a seat first?"}));
				connection.close();
			}
			if(typeof msg.username != "string" || msg.username.length < 1 || msg.username.length > 50){
				connection.send(JSON.stringify({event:"error",message:"Your name doesn't make any sense. Could you pick a better one?"}));
				connection.close();
			}

			var seat = this.players.findIndex(p=>!p.connection); // returns index first open seat or -1 (open = players connection is true)
			if(seat < 0){
				connection.send(JSON.stringify({event:"error",message:"Sorry, this games full. Maybe a spot'll open up in a bit?"}));
				connection.close();
				return;
			}
			this.players[seat].username = msg.username;

			this.notifyPlayers({
				event:"seatTaken",
				seat:seat,
				username:msg.username
				//connection: connection // i am here
			});
			this.players[seat].connection = connection;
			connection.on("close",()=>{ // listen for more events from this connection too
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
							if(!(msg.cards instanceof Array)) throw new Error("You have to pass three cards.");
							this.passCards(seat,msg.cards.map(this.mapCard.bind(this))); // what goes where to who what now?
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
		card = this.cards.filter(c=>c.color===card.color&&c.kind===card.kind)[0];
		if(!card) throw new Error("card does not exist");
		return card;
	}

	findGameStarter(){
		for(var i = 0; i < this.players.length; i++){
			if(this.players[i].cards.filter(c=>c===beginningCard).length) return i;
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

	/**
	 * currentRound has "startedBy (seat index), cards (played currently), add cards played + who started and check against the players seat
	 * @returns {boolean}
	 */
	isPlayersTurn(player) {
		if (this.currentRound.startedBy !== player && this.currentRound.cards.length === 0)
			return false;

		return (this.currentRound.startedBy + this.currentRound.cards.length) % this.players.length === player;
	}
}
