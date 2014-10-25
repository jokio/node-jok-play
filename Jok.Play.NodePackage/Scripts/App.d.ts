declare class Helper {
    static IO: any;
    static pluginHttp: any;
    static pluginSendgrid: any;
    static pluginMongojs: any;
    static SendMail(to: string, subject: string, body: string): void;
    static HttpGet(url: string, cb: any, parseJson?: boolean): void;
    static ChannelSockets(channel: string): any[];
    static SaveErrorLog(err: any): void;
    static FinishGame(obj: any, cb: any): void;
}
interface Array<T> {
    unique(): any[];
    contains(v: any): boolean;
    remove(item: any): boolean;
}
declare class GamePlayerBase {
    public UserID: number;
    public IPAddress: string;
    public IsVIP: boolean;
    public IsOnline: boolean;
    public HasAnyMoveMade: boolean;
    constructor(UserID: number, IPAddress: string, IsVIP: boolean, IsOnline: boolean);
    public send(command: string, ...params: any[]): void;
}
declare class GameTableBase<TGamePlayer extends GamePlayerBase> {
    private GamePlayerClass;
    public Channel: string;
    public Mode: number;
    public MaxPlayersCount: number;
    public IsVIPTable: boolean;
    public ID: string;
    public ActivePlayer: TGamePlayer;
    public Players: TGamePlayer[];
    public Status: TableStatus;
    constructor(GamePlayerClass: any, Channel?: string, Mode?: number, MaxPlayersCount?: number, IsVIPTable?: boolean);
    public join(user: any, ipaddress: any, channel: any, mode: any): TGamePlayer;
    public leave(userid: number): TGamePlayer;
    public start(): void;
    public finish(): void;
    public playersChanged(): void;
    public send(command: string, ...params: any[]): void;
    public getNextPlayer(player?: TGamePlayer): TGamePlayer;
}
declare enum TableStatus {
    New = 0,
    Started = 1,
    StartedWaiting = 2,
    Finished = 3,
}
declare var engine: any;
declare var engineRooms: any;
declare var http: any;
declare var urlParser: any;
declare class Server<TGamePlayer extends GamePlayerBase, TGameTable extends GameTableBase<GamePlayerBase>> {
    private port;
    private GameTableClass;
    private GamePlayerClass;
    static API_ROOT_URL: string;
    public StartTime: any;
    public GameTables: TGameTable[];
    public UsersCount: number;
    private io;
    constructor(port?: any, GameTableClass?: any, GamePlayerClass?: any);
    public httpHandler(req: any, res: any): void;
    public onConnectionOpen(socket: any): void;
    public findTable(user: any, channel: string, mode: number): TGameTable;
    public createTable(user: any, channel: any, mode: any): TGameTable;
    public isTournamentValid(channel: string, table: TGameTable, user: any): boolean;
    public isTournamentChannel(channel: string): boolean;
    static Start<TGamePlayer extends GamePlayerBase, TGameTable extends GameTableBase<GamePlayerBase>>(port?: any, TGameTable?: any, TGamePlayerClass?: any): Server<TGamePlayer, TGameTable>;
}
