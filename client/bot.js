var Client = require("./client");
var allCards = require("../server/cards");

module.exports = class Bot{
	constructor(client){
		this.client = client;
		this.isPlaying = false;
	}

	start() {
		this.client.addEventListener("change",this.play.bind(this)); // i used this instead of 'on' is it ok?
		this.isPlaying = true;
		// https://github.com/microsoft/TypeScript/issues/32210#issue-463080936
	}

	stop() {
		this.client.removeEventListener("change",this.play.bind(this));
		this.isPlaying = false;
	}

	play(){
		if (!this.client.connected) return;
		if (this.client.stage === "passing") {
			this.passCards();
		} else if(this.client.stage === "playing") {
			if (!this.isPlayersTurn()) return;
			this.playCard();
		}
	}

	passCards(){
		var cards = this.client.cards.slice(0).sort((a,b)=>allCards.kinds.indexOf(a.kind)-allCards.kinds.indexOf(b.kind));
		var selectedCards = [];

		while(selectedCards.length < 3){
			var card = this.pickCard(cards);
			selectedCards.push(cards.splice(card,1)[0]);
		}

		this.client.passCards(selectedCards);
	}

	pickCard(cards){
		// if we have the spade queen and we have only 3 or less spade cards in total, pass her
		var spadeQueen = cards.filter(c=>c.color === "spade" && c.kind==="queen").length>0;
		var spadeCardCount = cards.filter(c=>c.color === "spade").length;
		if(spadeQueen >= 0 && spadeCardCount <= 3){
			return spadeQueen;
		}

		var colorsByHighestLowestCard =
			["heart","diamond","club"]
			.map(color=>{
				var colorCards = cards.filter(c=>c.color===color);
				if(!colorCards.length) return 0;
				return {color:color,index:allCards.kinds.indexOf(colorCards.shift().kind)}
			})
			.sort((a,b)=>b.index-a.index)
			.map(c=>c.color);

		return cards.slice(0).reverse().findIndex(c=>c.color === colorsByHighestLowestCard[0]);

		// pass any card
		return 0;
	}

	playCard(){
		return this.pickCard(this.client.cards);
	}

	// lol idk if the logic is OK here
	isPlayersTurn() {
		console.log("Determing if its the players turn")
		console.log(this.client.currentRound, this.client.players, this.client.seat);
		console.log(!(this.client.currentRound.startedBy + this.client.currentRound.cards.length)%this.client.players !== this.client.seat);
		return !(this.client.currentRound.startedBy + this.client.currentRound.cards.length)%this.client.players !== this.client.seat;
	}
}
