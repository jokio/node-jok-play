/// <reference path="jok.helper.ts" />


class GameTableBase {

    public Players: GamePlayerBase[];

    public Status: number;


    constructor(public Channel = '', public Mode = 0) {
        this.Players = [];
    }



    public join(user, ipaddress, channel, mode) {

    }

    public leave(userid: number) {

    }



    send(command: string, ...params: any[]) {
        this.Players.forEach(p => p.send(command, params));
    }
}


class GamePlayerBase {

    public IPAddress: string;

    public IsVIP: boolean;

    public IsOnline: boolean;

    public UserID: number;


    public send(command: string, ...params: any[]) {

        var sockets = Helper.ChannelSockets('User' + this.UserID);
        if (!sockets) return;

        sockets.forEach(s => s.send(Helper.BuildCommand(command, params)));
    }
}
