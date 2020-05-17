var react = require("react");

module.exports = class PlayerEditor extends react.Component{
    constructor(props) {
        super(props);
        this.user = this.props.user
    }

    render() {
        return react.createElement("div", {className:"player-editor"},
            react.createElement("img", {src: this.user.avatar, className: "avatar"}),
            react.createElement("div", {className: "inputs"},
                react.createElement("label", {htmlFor: "username"}, "username"),
                react.createElement("input",{type: "text", id: "username", defaultValue: this.user.username, onChange:v=>{localStorage["username"] = v.target.value; this.user.username = v.target.value; this.forceUpdate()}}),
                react.createElement("label", {htmlFor: "avatar"}, "avatar url"),
                react.createElement("input",{type: "text", id: "avatar", defaultValue: this.user.avatar, onChange:v=>{localStorage["avatar"] = v.target.value; this.user.avatar = v.target.value; this.forceUpdate()}})
            )
        )
    }
}
