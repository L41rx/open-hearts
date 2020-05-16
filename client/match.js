var react = require("react");
var Client = require("./client");
var Card = require("./card");
var allCards = require("../server/cards");
var Bot = require("./bot");

module.exports = class Match extends react.Component{
	constructor(p){
		super(p);
		console.log(this.props);
		this.client = new Client(this.props.id, this.props.username);
		this.client.on("change",()=>this.forceUpdate());
		this.selectedCards = [];

		this.bot = new Bot(this.client);

		if (this.props.bot && this.props.bot !== 'false')
			this.bot.start();
	}
	render(){
		return react.createElement("div",{className:"game"},
			react.createElement("div",{className:"table"},new Array(this.client.players).fill(0).map((v,i)=>{ // loop over players, value index (0, i++)
				return react.createElement("div",{key:i,className:"player"+(this.client.isActive(i) ? " active" : "")},
					// For each player create a div with their name and score
					(()=>{
						if(!this.client.connected) return null;
						var games = this.client.games||[];
						var matchPoints = this.client.calculatePoints(games.slice(0,games.length-1));
						var gamePoints = this.client.calculatePoints(games.slice(games.length-1));
						return react.createElement("h1",{},
							this.renderUsername(i),
							react.createElement("br"),
							matchPoints[i]+" ("+gamePoints[i]+")");
					})(),
					(()=>{
						if(this.client.stage !== "playing") return null;
						var card = this.client.currentRound && this.client.currentRound.cards[(this.client.players+i-this.client.currentRound.startedBy)%this.client.players];
						if(!card) return null;
						return react.createElement(Card,{color:card.color,kind:card.kind,key:card.color+'-'+card.kind});
					})()
				)
			})),
			this.client.stage === "passing"?react.createElement("h2",{},"Pass 3 cards to "+this.renderUsername((this.client.seat+this.client.games.length)%this.client.players)):null,
			this.client.connected?react.createElement("div",{className:"hand"}, // this is the hand!!
				this.sortCards(this.client.cards).map(c=>
					react.createElement(Card,{color:c.color,kind:c.kind,className:(this.selectedCards.includes(c)?"active":""),onClick:this.clickCard.bind(this,c), key:c.color+'-'+c.kind})
				)
			):null,
			(()=>{
				if(!this.client.connected) return null;
				if(this.bot.isPlaying)
					return react.createElement("button", {className:"match-control", onClick:this.resumePlayerControl.bind(this)}, "Take control");
				else
					return react.createElement("button", {className:"match-control", onClick:this.handOverBot.bind(this)}, "Let the bot play");
			})(),
			react.createElement("button",{className:"match-control", onClick:this.returnToMatchlist.bind(this)}, "Return to matchlist"),
			this.client.connected?null:"connecting..."
		)
	}

	renderUsername(user){
		return (user+1)+": "+(this.client.usernames[user]||"")
	}

	sortCards(cards){
		return cards.slice().sort((a,b)=>{
			if(a.color === b.color){
				return allCards.kinds.indexOf(a.kind)-allCards.kinds.indexOf(b.kind);
			}else{
				return allCards.colors.indexOf(a.color)-allCards.colors.indexOf(b.color);
			}
		});
	}


	clickCard(card){
		if(this.client.stage === "passing"){
			var index = this.selectedCards.indexOf(card);
			if(index < 0){
				this.selectedCards.push(card);
			}else{
				this.selectedCards.splice(index,1);
			}
			this.forceUpdate();
			if(this.selectedCards.length === 3){
				this.client.passCards(this.selectedCards);
			}
		}else if(this.client.stage === "playing"){
			this.selectedCards = [];
			this.client.playCard(card);
		}
	}

	handOverBot() {
		this.bot.start();
		alert("Handing over control to the bot");
		console.log("In the future, try running bots in an incognito/private window or on a separate browser session. When you refresh a match it loads your username from local browser storage, so if you're not careful you'll replace your session with the bots!");
		this.client.emit("change");
		console.log(this.bot.isPlaying);
	}

	resumePlayerControl() {
		this.bot.stop();
		alert("Taking back manual control of the game");
		this.client.emit("change");
	}

	returnToMatchlist() {
		window.location.href = "/";
	}
}
