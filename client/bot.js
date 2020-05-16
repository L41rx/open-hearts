var Client = require("./client");
var allCards = require("../server/cards");

module.exports = class Bot{
	constructor(client){
		this.client = client;
		this.isPlaying = false;
		this.lowest = {};
		this.suit_counts = {};
	}

	start() {
		this.client.on("change",this.play.bind(this)); // i used this instead of 'on' is it ok?
		this.isPlaying = true;
		// https://github.com/microsoft/TypeScript/issues/32210#issue-463080936
	}

	stop() {
		this.client.removeListener("change",this.play.bind(this));
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

	playCard(){
		var card = this.pickCard(this.client.cards);
		console.log("Bot decides to play: ", card);
		this.client.playCard(card);
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

	pickCard(cards) {
		this.analyzeHand(cards);

		if (this.inKind("2", this.inSuit("club", cards)).length === 1) 	// if you have the two, play it
			return this.inKind("2", this.inSuit("club", cards))[0]

		if (this.isLeading()) {													// if we're leading...
			return this.random(this.inSuit(this.lowest.suit, cards)); 			// Lead a random card in the suit with the lowest count !
		} else { 																// if we're following the led suit
			var led_suit = this.client.currentRound.cards[0].color;
			if (typeof this.suit_counts[led_suit] !== 'undefined') {			// and we have the lead suit...
				var highest_in_suit_on_board = this.highest(this.inSuit(led_suit, this.client.currentRound.cards));
				return this.highestUnder(highest_in_suit_on_board.kind, this.inSuit(led_suit, cards));
			} else {															// or if we dont have the lead suit
				if (this.inSuit("heart", cards).length > 0)
					return this.highest(this.inSuit("heart", cards));
				else
					return this.highest(this.inSuit(this.lowest.suit, cards));
			}
		}

		return this.random(cards); //  if for some reason it fails return a random card
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
		var selected_card = cards[0];

		for (var i = 0; i < cards.length; i++) {
			// is selected card over higher than kind, but this is lower? take it
			if (this.kindToValue(selected_card.kind) > this.kindToValue(kind) && this.kindToValue(cards[i].kind) < this.kindToValue(selected_card.kind))
				selected_card = cards[i];

			// Otherwise, is selected card kind lower (good), and this one is higher?
			if (this.kindToValue(selected_card.kind) < this.kindToValue(kind) && this.kindToValue(cards[i].kind) > this.kindToValue(selected_card.kind))
				selected_card = cards[i];
		}

		return selected_card;
	}

	analyzeHand(cards) {
		console.log("Bot is thinking...");
		// this.sleep(500);
		// Count my suits regardless
		var suit_counts = {};
		for (var i = 0; i < cards.length; i++) {
			if (typeof suit_counts[cards[i].color] === 'undefined')
				suit_counts[cards[i].color] = 0;
			suit_counts[cards[i].color]++;
		}

		// remove hearts from analysis if its not broken
		if (!this.client.currentGame.heartsBroken)
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
		console.log("Bot analyzed its hand. Suit counts and lowest: ", suit_counts, lowest);
	}

	isLeading() {
		return this.client.currentRound.cards.length === 0
	}


	sleep(ms) {
		var start = new Date().getTime(), expire = start + ms;
		while (new Date().getTime() < expire) { }
		return;
	}
}
