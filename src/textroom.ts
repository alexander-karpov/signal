/**
 * @see https://janus.conf.meetecho.com/docs/textroom.html
 */

import WebRTCAdapter from "webrtc-adapter";
import Janus, { JanusJS } from "./janus";

type Action0 = () => void;
type Action<T> = (agr: T) => void;
type Action2<T1, T2> = (agr1: T1, arg2: T2) => void;

type Room = {
    "room": number,
    "description": string,
    "pin_required": boolean,
    "num_participants": number
}

type Participant = {
    "username": string,
    "room": number
}

type ErrorResponse = {
    "textroom": "error",
    "error": string,
    "error_code": number
};

type RoomsListResponse = {
    "textroom": "success",
    "list": Room[]
};

type JoinResponse = {
    "textroom": "success",
    "participants": { "username": string }[]
}

type LeaveResponse = {
    "textroom": "success"
}

type TextroomParams = {
    onJoin?: Action<Participant>;
    onLeave?: Action<Participant>;
    onMessage: Action2<string, string>;
    onClose?: Action0;
}

class Textroom {
    private textroom?: JanusJS.PluginHandle;
    private janus?: Janus;
    private transactions: Record<string, (data: any) => void> = {};
    private username: string = '';
    private currentRoom?: number;

    constructor(private readonly params: TextroomParams) { }

    async connect(server: string[]) {
        this.janus = await this.createJanus(server);
        this.textroom = await this.attachTextroomPlugin(this.janus);

        this.username = `user-${this.janus?.getSessionId()}`;
    }

    async roomsList() {
        return new Promise<Room[]>((resolve, reject) => {

            const transaction = Janus.randomString(12);

            this.textroom?.data({
                text: JSON.stringify({
                    textroom: "list",
                    transaction: transaction,
                }),
                error: reject,
                success: () => {
                    this.transactions[transaction] = (data: RoomsListResponse | ErrorResponse) => {
                        if (data.textroom === 'error') {
                            reject(data);

                            return;
                        };

                        resolve(data.list)
                    };
                }
            });
        });
    }

    async join(roomId: number) {
        return new Promise<Participant[]>((resolve, reject) => {

            const transaction = Janus.randomString(12);

            this.textroom?.data({
                text: JSON.stringify({
                    "textroom": "join",
                    transaction,
                    "room": roomId,
                    "username": this.username,
                    "history": false
                }),
                error: reject,
                success: () => {
                    this.transactions[transaction] = (data: JoinResponse | ErrorResponse) => {
                        if (data.textroom === 'error') {
                            reject(data);

                            return;
                        }

                        this.currentRoom = roomId;

                        resolve(data.participants.map(p => {
                            // @ts-expect-error
                            const participant: Participant = p;
                            participant.room = roomId;

                            return participant
                        }));
                    };
                }
            });
        });
    }

    async leave() {
        return new Promise<void>((resolve, reject) => {

            const transaction = Janus.randomString(12);

            this.textroom?.data({
                text: JSON.stringify({
                    "textroom": "leave",
                    transaction,
                }),
                error: reject,
                success: () => {
                    this.transactions[transaction] = (data: LeaveResponse | ErrorResponse) => {
                        if (data.textroom === 'error') {
                            reject(data);
                        }

                        this.currentRoom = undefined;

                        resolve();
                    };
                }
            });
        });
    }

    message(text: number) {
        this.textroom?.data({
            text: `{"textroom":"message","transaction":"no ack","room":${this.currentRoom},"text":"${text}","ack":false}`,
        });
    }

    private createJanus(server: string[]): Promise<Janus> {
        return new Promise<Janus>((resolve, reject) => {
            const janus = new Janus({
                server,
                success: () => resolve(janus),
                error: reject,
                destroyed: () => this.params.onClose?.()
            });
        });
    }

    private attachTextroomPlugin(janus: Janus): Promise<JanusJS.PluginHandle> {
        return new Promise<JanusJS.PluginHandle>((resolve, reject) => {
            let textroom: JanusJS.PluginHandle;

            janus.attach({
                plugin: "janus.plugin.textroom",
                success: (pluginHandle) => {
                    textroom = pluginHandle;
                    textroom.send({ message: { request: "setup" } });
                },
                error: reject,
                onmessage: (msg, jsep) => {
                    if (msg["error"]) {
                        reject(msg["error"]);
                        return;
                    }

                    if (jsep) {
                        textroom.createAnswer({
                            jsep: jsep,
                            tracks: [{ type: 'data' }],
                            success: function (jsep: any) {
                                textroom.send({ message: { request: "ack" }, jsep });
                            },
                            error: reject
                        });
                    }
                },
                ondataopen: () => resolve(textroom),
                oncleanup: () => this.params.onClose?.(),
                ondetached: () => this.params.onClose?.(),
                ondata: (data: any) => this.onData(data)
            });
        });
    }

    private onData(data: any) {
        const json = JSON.parse(data);
        const transaction: string | undefined = json.transaction;
        const action: string = json.textroom;

        if (transaction) {
            this.transactions[transaction]?.(json);
            delete this.transactions[transaction];

            return;
        }

        if (action === "join" && json.username !== this.username) {
            this.params.onJoin?.({
                username: json.username,
                room: json.room
            });

            return;
        }

        if (action === "leave" && json.username !== this.username) {
            this.params.onLeave?.({
                username: json.username,
                room: json.room
            });

            return;
        }

        if (action === "message" && json.from !== this.username) {
            this.params.onMessage(json.text, json.from);

            return;
        }
    }
}

// @ts-expect-error
window.Textroom = Textroom;

Janus.init({
    dependencies: Janus.useDefaultDependencies({
        adapter: WebRTCAdapter
    }),
    callback: function () {
        console.log('Janus init OK')
    }
});
