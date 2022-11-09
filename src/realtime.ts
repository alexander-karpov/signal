import * as Peer from 'simple-peer';

class RealtimeConnection {
    connect(): Promise<Peer.Instance> {
        return new Promise<Peer.Instance>((resolve, reject) => {
            const ws = new WebSocket('wss://yoide.su:3001');
            let peer: Peer.Instance | undefined;

            ws.onmessage = async (event) => {
                const action = JSON.parse(event.data.toString('utf8'));

                switch (action.type) {
                    case 'start': {
                        let signal;
                        [peer, signal] = await this.start();

                        ws.send(JSON.stringify({ type: 'signal', signal }));
                        break;
                    }
                    case 'signal': {
                        if (peer) {
                            peer.signal(action.signal);
                        } else {
                            let signal;
                            [peer, signal] = await this.takeCall(action.signal);

                            ws.send(JSON.stringify({ type: 'signal', signal }));
                        }

                        peer.once('connect', () => peer && resolve(peer));
                        peer.once('error', reject);

                        break;
                    }
                }
            };
        });
    }

    private start(): Promise<[Peer.Instance, Peer.SignalData]> {
        return new Promise((resolve, reject) => {
            const peer = this.createPeer(true);

            peer.once('signal', signal => resolve([peer, signal]));
            peer.once('error', reject);
        });
    }

    private takeCall(callerSignal: Peer.SignalData): Promise<[Peer.Instance, Peer.SignalData]> {
        return new Promise((resolve, reject) => {
            const peer = this.createPeer(false);

            peer.once('signal', signal => {
                resolve([peer, signal]);
                peer.removeAllListeners('error');
            });

            peer.once('error', reject);

            peer.signal(callerSignal);
        });
    }

    private createPeer(initiator: boolean): Peer.Instance {
        return new Peer({
            initiator,
            channelConfig: { ordered: false, maxRetransmits: 0 },
            config: {
                iceServers: [
                    {
                        urls: [
                            "stun:51.250.76.61:3478",
                            "stun:stun.l.google.com:19302",
                            "stun:openrelay.metered.ca:80",
                        ],
                    },
                    {
                        urls: "turn:51.250.76.61:3478",
                        username: "turnuser",
                        credential: "turn456",
                    },
                ]
            },
            trickle: false
        });
    }
}

class Realtime {
    private peer?: Peer.Instance;

    constructor(private receiveHandler: (data: Peer.SimplePeerData) => void) { }

    async connect() {
        try {
            console.log('Realtime connecting…');
            this.peer = await new RealtimeConnection().connect();

            console.log('OK');
        } catch (err) {
            console.log('FAILED');
            setTimeout(() => {
                console.log('Realtime: retry connect');
                this.connect();
            }, 1000);

            throw err;
        }

        this.peer.on('data', (data) => this.receiveHandler(data));

        this.peer.on('error', (err) => {
            setTimeout(() => {
                this.connect();
                console.log('Realtime: retry connect');
            }, 1000);

            this.peer = undefined;
            throw err;
        });
    }

    send(data: Peer.SimplePeerData) {
        if (this.peer) {
            this.peer.send(data);
        }
    }
}

// @ts-expect-error
window.Realtime = Realtime;