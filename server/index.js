var Koa = require("koa");
var mount = require("koa-mount");
var compose = require("koa-compose");
var Static = require("koa-static");
var route = require("koa-route");
var bodyParser = require('koa-bodyparser');
var upgrade = require("koa-upgrade");
var browserify = require("browserify");
var watchify = require("watchify");
var path = require("path");
var fs = require("fs");
var Match = require("./match");

var config = JSON.parse(fs.readFileSync("./config.json")+"");

var build = browserify({cache:{},packageCache:{},entries:[path.resolve(__dirname,"../client/index.js")],plugin:[watchify]}); // build client.js...
var client = "";

function bundle(){
	build.bundle((err,bundle)=>{
		console.log(err,bundle);
		client = bundle;
		console.log("bundled");
	})
}
bundle();
build.on("update",bundle);

var matches = {};

// Sorry. Where should I put this?
function getParameterByName(name, url) {;
	name = name.replace(/[\[\]]/g, '\\$&');
	var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
		results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

var app = new Koa();
upgrade(app);
app.use(bodyParser());
app.use(mount("/public/cardsJS",Static("./node_modules/cardsJS/dist")))
app.use(mount("/public",Static("./public")));
app.use(
	compose([
		route.get("/client.js",async ctx=>{
			ctx.body = client; // built client.js
		}),
		route.get("/",async ctx=>{ // matchlist
			ctx.body =
`<html>
	<head>
		<link rel="stylesheet" href="/public/matchlist.css"/>
		<script src="/client.js"></script>
	</head>
	<body>
		<div id="container"></div>
		<script>
			reactDom.render([react.createElement(MatchList, {key:1})],document.getElementById("container"));
		</script>
	</body>
</html>`;

		}),
		route.get("/matches/:match",async (ctx,match)=>{ // just joining a match
			var username = getParameterByName("username", ctx.request.url);
			var avatar = getParameterByName("avatar", ctx.request.url);
			var bot = getParameterByName("bot", ctx.request.url);

			if (bot === null || bot === "false") bot = false;
			if (bot === "true") bot = true;
			if (username === null) username = "lain";
			if (avatar === null) avatar = "https://lainsafe.duckdns.org/files/ofsgNgof.png";

			ctx.body =
`<html>
	<head>
		<link rel="stylesheet" href="/public/cardsJS/cards.min.css"/>
		<link rel="stylesheet" href="/public/match.css"/>
		<script src="/client.js"></script>
	</head>
	<body>
		<div id="container"></div>
		<script>
			reactDom.render([react.createElement(Match,{id:"${match}", username:"${username}", avatar:"${avatar}", bot:"${bot}", key:"${match}"})],document.getElementById("container"));
		</script>
	</body>
</html>`;
		}), // APIS
		route.get("/api/matches",async ctx=>{
			ctx.body = JSON.stringify(Object.keys(matches).map(id=>{
				var match = matches[id];
				return {
					id: id,
					players: match.players.filter(p=>p.connection).length,
					game: match.games.length,
					name: match.name,
					points_to_end: match.points_to_end,
					moon_bonus_up: match.moon_bonus_up,
					moon_bonus_down: match.moon_bonus_down,
					pass_order: match.pass_order,
					started_by: match.started_by
				}
			}))
		}),
		// create new match...
		route.post("/api/matches", async ctx => {
			var id = new Date().getTime();

			var match = new Match(
				ctx.request.body.name,
				ctx.request.body.points_to_end,
				ctx.request.body.moon_bonus_up,
				ctx.request.body.moon_bonus_down,
				ctx.request.body.pass_order,
				ctx.request.body.started_by,
			);

			matches[id] = match;
			match.once("close",()=>{
				delete matches[id];
			});
			ctx.body = id+"";
		}),
		// websocket connection made in client.js constructor...
		route.get("/api/matches/:match",async (ctx,match)=>{ // this is the join code actually
			match = matches[match];
			if(!match) ctx.throw(404);
			var connection = await ctx.upgrade();
			match.takeSeat(connection); // there is takeSeat method and takeSeat event ! two different things. b careful
										// the connection here is listened on for a takeSeat after to ensure not just anyone can pop in and nab it
			await(new Promise(()=>{}));
		})
	])
)

app.listen(config.port);
