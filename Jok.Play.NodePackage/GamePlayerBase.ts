/// <reference path="helper.ts" />


class GamePlayerBase {

    public HasAnyMoveMade = false;


    constructor(public UserID: number, public IPAddress: string, public IsVIP: boolean, public IsOnline: boolean) {
    }


    public send(command: string, ...params: any[]) {

        var sockets = Helper.ChannelSockets('User' + this.UserID);
        if (!sockets) return;

        params.unshift(command);

        var cmd = JSON.stringify(params);

        sockets.forEach(s => s.send(cmd));
    }
}