import fetch from "node-fetch";
import * as crypto from "crypto";
import { getPreferenceValues } from "@raycast/api";

export class GateHubAPI {
  private readonly key: string;
  private readonly secret: string;
  private readonly environment: string;

  constructor(key: string, secret: string, environment: string) {
    this.key = key;
    this.secret = secret;
    this.environment = environment;
  }

  private async generateSignature(timestamp: string, method: string, endpoint: string, body?: URLSearchParams | null) {
    let payload = `${timestamp}|${method}|${endpoint}`;
    if (body) {
      const paramsObj = Object.fromEntries(body.entries());
      payload = `${payload}|${JSON.stringify(paramsObj)}`
    }

    const hmac = crypto.createHmac("sha256", this.secret).update(payload).digest("hex");

    return hmac;
  }

  private get baseUrl() {
    if (this.environment.toLowerCase() === 'production') {
      return 'https://api.gatehub.net'
    }
    return 'https://api.sandbox.gatehub.net'
  }

  private async call(endpoint: string, method: string, body?: URLSearchParams | null) {
    const url = `${this.baseUrl}/${endpoint}`
    const timestamp = new Date().getTime();
    const obj: any = {
      method, 
      headers: {
        "x-gatehub-app-id": this.key,
        "x-gatehub-timestamp": timestamp.toString(),
        "x-gatehub-signature": await this.generateSignature(timestamp.toString(), method, url, body),
      },
    }
    
    if (body) {
      obj['body'] = Object.fromEntries(body.entries())
    }

    return fetch(url, obj)
  }

  public async getUser() {
    return this.call("auth/v1/user", "GET");
  }

  private mapTypeToString(type: number): string {
    switch (type) {
      case 0:
        return "Hosted";
      case 10:
      case 11:
        return "XRPL";
      case 12:
        return "XRPL Custodial";
      case 24:
        return "PSD";
      case 30:
      case 31:
        return "Xahau";
      default:
        return "Unknown";
    }
  }

  public async createWallet(userUuid: string, name: string) {
    const body: URLSearchParams = new URLSearchParams()
    body.append('name', name)
    body.append('type', "0")
    const response = await this.call(`core/v1/users/d7777a5a-84a2-46e1-ba35-1c099751658b/wallets`, 'POST', body)
    return await response.json()
  }

  public async getBalance(wallet: string) {
    const response = await this.call(`core/v1/wallets/${wallet}/balances`, "POST");
    const data = await response.json();
    return data;
  }

  public async getWallets() {
    const user = await this.getUser()
    console.log('USER', await user.json())
    const response = await this.call(
      "core/v1/users/d7777a5a-84a2-46e1-ba35-1c099751658b",
      "GET",
    );
    const data: any = await response.json();

    return (data.wallets ?? [])
      .filter((x: any) => ![1, 32].includes(x.type))
      .map((x: any) => ({
        ...x,
        type: this.mapTypeToString(x.type),
      }));
  }
}

interface Preferences {
  apiKey: string;
  apiSecret: string;
  environment: string;
}

const preferences = getPreferenceValues<Preferences>();
export default new GateHubAPI(preferences.apiKey, preferences.apiSecret, preferences.environment);
