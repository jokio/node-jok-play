/// <reference path="gameplayerbase.ts" />
/// <reference path="helper.ts" />



class GameTableBase<TGamePlayer extends GamePlayerBase> {

    public ID: string;

    public ActivePlayer: TGamePlayer;

    public Players: TGamePlayer[];

    public Status: TableStatus = TableStatus.New;


    constructor(private GamePlayerClass, public Channel = '', public Mode = 0, public MaxPlayersCount = 2, public IsVIPTable = false) {
        this.ID = require('node-uuid').v4();
        this.Players = [];
    }


    public join(user, ipaddress, channel, mode) {

        var player = this.Players.filter(p => p.UserID == user.UserID)[0];
        if (!player)
            player = new this.GamePlayerClass(user.UserID, ipaddress, user.IsVIP, true);

        player.IsOnline = true;

        switch (this.Status) {
            // ახალი მაგიდაა და მოთამაშეები ივსება ჯერ
            case TableStatus.New:
                {
                    if (!this.Players.contains(player)) {
                        this.Players.push(player);
                        this.playersChanged();
                    }

                    // თუ 2 კაცი შეიკრიბა თამაში დაიწყოს
                    if (this.Players.length == this.MaxPlayersCount) {
                        this.start();
                    }
                }
                break;

            // დაწყებული იყო თამაში და აგრძელებს თამაშს
            case TableStatus.Started:
            case TableStatus.StartedWaiting:
                {
                    if (!this.Players.contains(player)) return;

                    this.Status = TableStatus.Started;
                    this.playersChanged();
                }
                break;
        }

        return player;
    }

    public leave(userid: number) {

        var player = this.Players.filter(p=> p.UserID == userid)[0];
        if (player == null) return;

        player.IsOnline = false;


        switch (this.Status) {
            // თუ ჯერ არ დაწყებულა თამაში, იშლება მოთამაშე სიიდან ეგრევე
            case TableStatus.New:
                {
                    this.Players.remove(player);
                    this.playersChanged();
                }
                break;

            // თუ დაწყებული იყო თამაში, მაგიდის სტატუსი იცვლება და მაგიდაზე დარჩენილ
            // მოთამაშეს ეგზავნება მაგიდის განახლებული მდგომარეობა
            case TableStatus.Started:
                {
                    // თუ ორივე მოთამაშემ არ გააკეთა ერთ სვლა მაინც, მაგიდის სტატუსი გადადის ახალზე
                    if (this.Players.filter(p => p.HasAnyMoveMade).length != 2) {

                        this.Status = TableStatus.New;
                        this.Players.remove(player);
                        this.playersChanged();
                        break;
                    }

                    this.Status = TableStatus.StartedWaiting;
                    this.playersChanged();
                }
                break;

            case TableStatus.Finished:
                {
                    this.Players.remove(player);
                    this.playersChanged();
                }
                break;
        }

        return player;
    }


    start() {

    }

    finish() {

    }

    playersChanged() {

    }


    send(command: string, ...params: any[]) {

        params.unshift(command);

        this.Players.forEach(p => p.send.apply(p, params));
    }

    getNextPlayer(player?: TGamePlayer): TGamePlayer {

        if (this.Players.length <= 1) return;

        if (!player)
            player = this.ActivePlayer;

        if (!player) return;


        var index = this.Players.indexOf(player);

        return this.Players[index < this.Players.length - 1 ? ++index : 0];
    }
}

enum TableStatus {
    New,
    Started,
    StartedWaiting,
    Finished
}