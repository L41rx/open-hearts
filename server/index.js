var Koa = require("koa");
var mount = require("koa-mount");
var compose = require("koa-compose");
var Static = require("koa-static");
var route = require("koa-route");
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

var app = new Koa();
upgrade(app);
app.use(mount("/public/cardsJS",Static("./node_modules/cardsJS/dist")))
app.use(mount("/public/bootstrap",Static("./node_modules/bootstrap/dist")))
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
		<link rel="stylesheet" href="/public/bootstrap/css/bootstrap.min.css"/>
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
		route.get("/matches/:match",async (ctx,match)=>{ // match. sent to from /api/
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
			reactDom.render([react.createElement(Match,{id:"${match}", key:"${match}"})],document.getElementById("container"));
		</script>
	</body>
</html>`;
		}), // APIS
		route.get("/api/matches",async ctx=>{
			ctx.body = JSON.stringify(Object.keys(matches).map(id=>{
				var match = matches[id];
				return {
					id: id,
					players:match.players.filter(p=>p.connection).length,
					game:match.games.length
				}
			}))
		}),
		// create new match...
		route.post("/api/matches",async ctx=>{
			var id = new Date().getTime();
			var match = new Match();
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
