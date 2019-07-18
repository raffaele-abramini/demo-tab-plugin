import { SyncClient } from 'twilio-sync';
import uuidv4 from 'uuid/v4'

const getByID = (id) => (item) => item.key === id;
const deviceTokenKEy = "devideToke";

export const stuff = {
  bootstrap: async function(manager) {
    this.state = manager.store.getState().flex;
    this.token = this.state.session.ssoTokenPayload.token;
    this.client = new SyncClient(this.token);
    this.devicesMap = await this.client.map(`devices_${this.state.worker.worker.sid}`);

    const items  = await this.devicesMap.getItems();

    console.warn(items.items.find(getByID(this.getDeviceToken())));

    await this.devicesMap.set(this.getDeviceToken(), {})
  },

  getDeviceToken() {
    if (localStorage.getItem(`${deviceTokenKEy}__${this.token}`)) {
      return localStorage.getItem(`${deviceTokenKEy}__${this.token}`);
    } else {
      const t = uuidv4();
      localStorage.setItem(`${deviceTokenKEy}__${this.token}`, t)
      return t
    }
  }
}