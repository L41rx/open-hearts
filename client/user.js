module.exports = class User {
    constructor(props) {
        this.username = props.username||localStorage["username"]||"lain";
        this.avatar = props.avatar||localStorage["avatar"]||"https://lainsafe.duckdns.org/files/ofsgNgof.png";
    }

    setUsername(username) {
        this.username = username;
    }

    getUsername() {
        return this.username;
    }

    setAvatar(a) {
        this.avatar = a;
    }

    getAvatar() {
        return this.avatar;
    }
}
