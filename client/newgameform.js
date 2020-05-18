var react = require("react");

module.exports = class NewGameForm extends react.Component{
    constructor(props) {
        super(props);
        this.createGameCallback = this.props.createGameCallback;
        this.createBotGameCallback = this.props.createBotGameCallback;

        this.form_id = "new-game-form";

        this.name = {id: "name", type: "text", text: "name", def: "iwakura", value: "iwakura"};
        this.points_to_end = {id: "points_to_end", type: "number", text: "points to end", def: 100, value: 100};
        this.moon_bonus_up = {id: "moon_bonus_up", type: "number", text: "moon: points up", def: 25, value: 25};
        this.moon_bonus_down = {id: "moon_bonus_down", type: "number", text: "moon: points down", def: 0, value: 0};
        this.pass_order = {id: "pass_order", type: "text", text: "pass order", def: "SLRA", value: "SLRA"};
    }

    render() {
        var property_names = [this.name, this.points_to_end, this.moon_bonus_up, this.moon_bonus_down, this.pass_order];

        return react.createElement("div", {className: "new-game-container"},
            react.createElement("h2", null, "new game"),
            react.createElement("div", {className: "new-game", id: this.form_id},
                property_names.map((property, index) => {
                    return react.createElement("div", {className: "game-property", key: index},
                        react.createElement("input", {id: property.id, name: property.id, defaultValue: property.def, type: property.type, onChange: (v) => this[property.id].value = v.target.value}),
                        react.createElement("label", {htmlFor: property.id}, property.text)
                    );
                }),
                react.createElement("button",{className:"button create-game", onClick: this.newGame.bind(this)}, "new game"),
                react.createElement("button", {className:"button create-bot-game", onClick: this.newBotGame.bind(this)}, "new bot game")
                //react.createElement("button",{className:"button debug", onClick: this.debug.bind(this)}, "debug")
            )
        );
    }

    newGame() {
        this.createGameCallback(this.name, this.points_to_end, this.moon_bonus_up, this.moon_bonus_down, this.pass_order);
    }

    newBotGame() {
        this.createBotGameCallback(this.name, this.points_to_end, this.moon_bonus_up, this.moon_bonus_down, this.pass_order);
    }

    debug() {
        console.log(this.name, this.points_to_end, this.moon_bonus_up, this.moon_bonus_down, this.pass_order);
    }
}
