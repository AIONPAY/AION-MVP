import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";

export interface WebSocketClient {
  ws: WebSocket;
  subscriptions: Set<string>;
  clientId: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // topic -> clientIds

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: "/ws"
    });

    this.wss.on("connection", this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket): void {
    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      ws,
      subscriptions: new Set(),
      clientId
    };

    this.clients.set(clientId, client);
    console.log(`WebSocket client connected: ${clientId}`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: "connected",
      data: { clientId },
      timestamp: Date.now()
    });

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error("Invalid WebSocket message:", error);
        this.sendToClient(clientId, {
          type: "error",
          data: { error: "Invalid message format" },
          timestamp: Date.now()
        });
      }
    });

    ws.on("close", () => {
      this.handleDisconnection(clientId);
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  }

  private handleMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case "subscribe":
        this.handleSubscription(clientId, message.topic);
        break;
        
      case "unsubscribe":
        this.handleUnsubscription(clientId, message.topic);
        break;
        
      case "ping":
        this.sendToClient(clientId, {
          type: "pong",
          data: {},
          timestamp: Date.now()
        });
        break;
        
      default:
        this.sendToClient(clientId, {
          type: "error",
          data: { error: `Unknown message type: ${message.type}` },
          timestamp: Date.now()
        });
    }
  }

  private handleSubscription(clientId: string, topic: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Add to client subscriptions
    client.subscriptions.add(topic);

    // Add to topic subscriptions
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(clientId);

    console.log(`Client ${clientId} subscribed to ${topic}`);
    
    this.sendToClient(clientId, {
      type: "subscribed",
      data: { topic },
      timestamp: Date.now()
    });
  }

  private handleUnsubscription(clientId: string, topic: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from client subscriptions
    client.subscriptions.delete(topic);

    // Remove from topic subscriptions
    const topicSubscribers = this.subscriptions.get(topic);
    if (topicSubscribers) {
      topicSubscribers.delete(clientId);
      if (topicSubscribers.size === 0) {
        this.subscriptions.delete(topic);
      }
    }

    console.log(`Client ${clientId} unsubscribed from ${topic}`);
    
    this.sendToClient(clientId, {
      type: "unsubscribed",
      data: { topic },
      timestamp: Date.now()
    });
  }

  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all topic subscriptions
    for (const topic of client.subscriptions) {
      const topicSubscribers = this.subscriptions.get(topic);
      if (topicSubscribers) {
        topicSubscribers.delete(clientId);
        if (topicSubscribers.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    }

    // Remove client
    this.clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  }

  public broadcast(type: string, data: any, topic?: string): void {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now()
    };

    if (topic) {
      // Send to topic subscribers only
      const subscribers = this.subscriptions.get(topic);
      if (subscribers) {
        for (const clientId of subscribers) {
          this.sendToClient(clientId, message);
        }
      }
    } else {
      // Send to all connected clients
      for (const clientId of this.clients.keys()) {
        this.sendToClient(clientId, message);
      }
    }
  }

  public sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    }
  }

  public sendToTransferSubscribers(transferId: number, type: string, data: any): void {
    this.broadcast(type, { transferId, ...data }, `transfer:${transferId}`);
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getSubscriptionCount(topic: string): number {
    return this.subscriptions.get(topic)?.size || 0;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public close(): void {
    for (const client of this.clients.values()) {
      client.ws.close();
    }
    this.wss.close();
  }
}