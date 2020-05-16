var react = require("react");
var Client = require("./client");
var Card = require("./card");
var allCards = require("../server/cards");
var Bot = require("./bot");

module.exports = class Match extends react.Component{
	constructor(p){
		super(p);
		this.client = new Client(this.props.id,localStorage["username"]||"lain");
		this.client.on("change",()=>this.forceUpdate());
		this.selectedCards = [];
	}
	render(){
		return react.createElement("div",{className:"game"},
			react.createElement("div",{className:"table"},new Array(this.client.players).fill(0).map((v,i)=>{ // loop over players, value index (0, i++)
				return react.createElement("div",{key:i,className:"player"+(i==(this.client.currentRound&&(this.client.currentRound.startedBy+this.client.currentRound.cards.length)%this.client.players) && this.client.stage == "playing"?" active":"")},
					// For each player create a div with their name and score
					(()=>{
						if(!this.client.connected) return null; // why are they always connected?
						var games = this.client.games||[];
						var matchPoints = this.client.calculatePoints(games.slice(0,games.length-1));
						var gamePoints = this.client.calculatePoints(games.slice(games.length-1));
						return react.createElement("h1",{},
							this.renderUsername(i),
							react.createElement("br"),
							matchPoints[i]+" ("+gamePoints[i]+")");
					})(),
					(()=>{
						if(this.client.stage != "playing") return null;
						var card = this.client.currentRound && this.client.currentRound.cards[(this.client.players+i-this.client.currentRound.startedBy)%this.client.players];
						if(!card) return null;
						return react.createElement(Card,{color:card.color,kind:card.kind,key:card.color+'-'+card.kind});
					})()
				)
			})),
			this.client.stage=="passing"?react.createElement("h2",{},"Pass 3 cards to "+this.renderUsername((this.client.seat+this.client.games.length)%this.client.players)):null,
			this.client.connected?react.createElement("div",{className:"hand"}, // this is the hand!!
				this.sortCards(this.client.cards).map(c=>
					react.createElement(Card,{color:c.color,kind:c.kind,className:(this.selectedCards.includes(c)?"active":""),onClick:this.clickCard.bind(this,c), key:c.color+'-'+c.kind})
				)
			):null,
			// todo (admin check?)
			react.createElement("button", {className:"match-control", onClick:this.addBot.bind(this)}, "Add bot"),
			this.client.connected?null:"connecting..."
		)
	}

	renderUsername(user){
		return (user+1)+": "+(this.client.usernames[user]||"")
	}

	sortCards(cards){
		return cards.slice().sort((a,b)=>{
			if(a.color == b.color){
				return allCards.kinds.indexOf(a.kind)-allCards.kinds.indexOf(b.kind);
			}else{
				return allCards.colors.indexOf(a.color)-allCards.colors.indexOf(b.color);
			}
		});
	}


	clickCard(card){
		if(this.client.stage == "passing"){
			var index = this.selectedCards.indexOf(card);
			if(index < 0){
				this.selectedCards.push(card);
			}else{
				this.selectedCards.splice(index,1);
			}
			this.forceUpdate();
			if(this.selectedCards.length == 3){
				this.client.passCards(this.selectedCards);
			}
		}else if(this.client.stage == "playing"){
			this.selectedCards = [];
			this.client.playCard(card);
		}
	}

	addBot() {
		alert("wwwwwwwwww");
	}
}
