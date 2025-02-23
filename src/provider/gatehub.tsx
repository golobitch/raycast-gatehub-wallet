import fetch from "node-fetch";
import * as crypto from "crypto";
import { getPreferenceValues } from "@raycast/api";

export class GateHubAPI {
  private readonly key: string;
  private readonly secret: string;
  private readonly environment: string;
  private readonly userUuid: string;

  constructor(key: string, secret: string, environment: string, userUuid: string) {
    this.key = key;
    this.secret = secret;
    this.userUuid = userUuid;
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

  public async getBalance(wallet: string) {
    const response = await this.call(`core/v1/wallets/${wallet}/balances`, "POST");
    const data = await response.json();
    return data;
  }

  public async getWallets() {
    const response = await this.call(
      `core/v1/users/${this.userUuid}`,
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
  userUuid: string;
  environment: string;
}

const preferences = getPreferenceValues<Preferences>();
export default new GateHubAPI(preferences.apiKey, preferences.apiSecret, preferences.environment, preferences.userUuid);
