var Client = require("./client");
var allCards = require("../server/cards");

module.exports = class Bot{
	constructor(client){
		this.client = client;
		this.isPlaying = false;
		this.lowest = {};
		this.suit_counts = {};
		this.listener_reference = null;
		this.selectedCards = [];
	}

	start() {
		this.listener_reference = this.play.bind(this);
		this.client.on("change", this.listener_reference);
		this.isPlaying = true;
		// https://github.com/microsoft/TypeScript/issues/32210#issue-463080936
	}

	stop() {
		this.client.removeListener("change", this.listener_reference);
		this.listener_reference = null;
		this.isPlaying = false;
		this.selectedCards = [];
	}

	play(){
		if (!this.client.connected) return;
		if (this.client.stage === "passing" && this.selectedCards.length !== 3) {
			this.passCards();
		} else if(this.client.stage === "playing") {
			this.selectedCards = [];
			if (!this.isPlayersTurn()) return;
			this.playCard();
		}
	}

	playCard(){
		var card = this.pickCard(this.client.cards);
		console.log(this.getName() + " decides to play: ", card);
		this.client.playCard(card);
	}

	passCards(){
		this.selectedCards = [];
		var cards = this.client.cards.slice(0).sort((a,b)=>allCards.kinds.indexOf(b.kind)-allCards.kinds.indexOf(a.kind)); // sort by highest?

		while(this.selectedCards.length < 3){ // push the three highest on
			var card = this.pickCard(cards);
			this.selectedCards.push(cards.splice(card,1)[0]);
		}

		this.client.emit("change");

		this.client.passCards(this.selectedCards);
	}

	pickCard(cards) {
		this.analyzeHand(cards);

		if (this.inKind("2", this.inSuit("club", cards)).length === 1) { 	// if you have the two, play it
			this.muse("I have to play the two of course!")
			return this.inKind("2", this.inSuit("club", cards))[0];
		}

		if (this.isLeading()) {													// if we're leading...
			this.muse("I get to choose? Better play something from my lowest suit, "+this.lowest.suit+"s.");
			return this.random(this.inSuit(this.lowest.suit, cards)); 			// Lead a random card in the suit with the lowest count !
		} else { 																// if we're following the led suit
			var led_suit = this.client.currentRound.cards[0].color;
			this.muse("Have to play "+led_suit+"s...");
			if (typeof this.suit_counts[led_suit] !== 'undefined') {			// and we have the lead suit...
				var highest_in_suit_on_board = this.highest(this.inSuit(led_suit, this.client.currentRound.cards));
				this.muse("Looks like I have to slide under the " + highest_in_suit_on_board.kind);
				return this.highestUnder(highest_in_suit_on_board.kind, this.inSuit(led_suit, cards));
			} else {															// or if we dont have the lead suit
				this.muse("At least I'm void. Maybe I can dump a heart or something high in what I'm low in.")
				if (cards.length !== 13 && this.hasPoints(cards)) // if you're void in a suit and its not the first round you may break hearts
					return (this.inKind("queen", this.inSuit("spade", cards)).length === 1) ? this.inKind("queen", this.inSuit("spade", cards))[0] : this.highest(this.inSuit("heart", cards));
				else
					return this.highest(this.inSuit(this.lowest.suit, cards));
			}
		}

		return this.random(cards); //  if for some reason it fails return a random card
	}

	muse(msg) {
		console.log(this.getName() + " thinks: [ "+msg+" ]");
	}

	kindToValue(kind) {
		switch (kind) {
			case "2": return 2;
			case "3": return 3;
			case "4": return 4;
			case "5": return 5;
			case "6": return 6;
			case "7": return 7;
			case "8": return 8;
			case "9": return 9;
			case "10": return 10;
			case "jack": return 11;
			case "queen": return 12;
			case "king": return 13;
			case "ace": return 14;
		}
	}

	/**
	 * currentRound has "startedBy (seat index), cards (played currently), add cards played + who started and check against the players seat
	 * @returns {boolean}
	 */
	isPlayersTurn() {
		if (this.client.currentRound.cards.length === this.client.players) // dont play if the board is full
			return false;

		if (this.client.currentRound.startedBy !== this.client.seat && this.client.currentRound.cards.length === 0)
			return false;

		return (this.client.currentRound.startedBy + this.client.currentRound.cards.length) % this.client.players === this.client.seat;
	}

	/**
	 * Returns a random integer between min (inclusive) and max (inclusive).
	 * The value is no lower than min (or the next integer greater than min
	 * if min isn't an integer) and no greater than max (or the next integer
	 * lower than max if max isn't an integer).
	 * Using Math.round() will give you a non-uniform distribution!
	 */
	getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	/**
	 * returns one card
	 * @param cards
	 */
	highest(cards) {
		var highest_card = cards[0];
		for (var i = 0; i < cards.length; i++)
			if (this.kindToValue(cards[i].kind) > this.kindToValue(highest_card))
				highest_card = cards[i];

		return highest_card;
	}

	/**
	 * returns one card
	 * @param cards
	 */
	lowest(cards) {
		var lowest_card = cards[0];
		for (var i = 0; i < cards.length; i++)
			if (this.kindToValue(cards[i].kind) < this.kindToValue(highest_card))
				lowest_card = cards[i];

		return lowest_card;
	}

	/**
	 * returns an array of cards
	 * @param suit
	 * @param cards
	 */
	inSuit(suit, cards) {
		var cards_in_suit = [];
		for (var i = 0; i < cards.length; i++)
			if (cards[i].color === suit)
				cards_in_suit.push(cards[i]);

		return cards_in_suit;
	}

	inKind(kind, cards) {
		var cards_in_kind = [];
		for (var i = 0; i < cards.length; i++)
			if (cards[i].kind === kind)
				cards_in_kind.push(cards[i]);

		return cards_in_kind;
	}

	/**
	 * returns one card
	 * @param cards
	 * @returns {*}
	 */
	random(cards) {
		return cards[this.getRandomInt(0, cards.length-1)];
	}

	/**
	 * Returns one card. Given a kind
	 *
	 * @param kind
	 * @param inSuit1
	 * @returns {undefined}
	 */
	highestUnder(kind, cards) {
		var selected_card = null;

		for (var i = 0; i < cards.length; i++) {
			// is it lower than the limit, and higher-est?
			if (this.kindToValue(cards[i].kind) < this.kindToValue(kind) && (selected_card === null || this.kindToValue(cards[i].kind) > this.kindToValue(selected_card.kind)))
				selected_card = cards[i];
		}

		if (selected_card === null)
			return this.random(cards); // well, guess you cant slide under..

		return selected_card;
	}

	getName() {
		return this.client.usernames[this.client.seat];
	}

	analyzeHand(cards) {
		console.log(this.getName() + " is thinking...");
		// this.sleep(500);
		// Count my suits regardless
		var suit_counts = {};
		for (var i = 0; i < cards.length; i++) {
			if (typeof suit_counts[cards[i].color] === 'undefined')
				suit_counts[cards[i].color] = 0;
			suit_counts[cards[i].color]++;
		}

		// if the entire hand isnt hearts... AND (hearts isnt broken or its the first round
		if (this.inSuit("heart", cards).length !== cards.length && (!this.client.currentGame.heartsBroken || cards.length === 13))
			delete suit_counts["heart"];

		// And mark which is the lowest...
		var lowest = {suit: null, count: 100};
		Object.keys(suit_counts).forEach(function (suit) {
			if (suit_counts[suit] < lowest.count) {
				lowest.suit = suit;
				lowest.count = suit_counts[suit];
			}
		});

		this.suit_counts = suit_counts;
		this.lowest = lowest;
		this.muse("Let's see what's in my hand...");
	}

	isLeading() {
		return this.client.currentRound.cards.length === 0
	}


	sleep(ms) {
		var start = new Date().getTime(), expire = start + ms;
		while (new Date().getTime() < expire) { }
		return;
	}

	/**
	 * do these cards contain hearts or the queen
	 * @param cards
	 * @returns {boolean}
	 */
	hasPoints(cards) {
		return (this.inSuit("heart", cards).length > 0) || this.inKind("queen", this.inSuit("spade", cards)).length === 1;
	}
}
