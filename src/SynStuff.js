import { SyncClient } from 'twilio-sync'
import uuidv4 from 'uuid/v4'
import React from 'react'
import { connect } from 'react-redux'
import { ModalPopupWithEntryControl, IconButton, styled } from '@twilio/flex-ui';
import UAParser from 'ua-parser-js';

const extractID = (item) => item.descriptor.key
const deviceTokenKEy = 'devideToke'

export const stuff = {
  async bootstrap(flex, manager) {
    this.flex = flex;
    this.manager = manager;
    this.setupRedux();
    flex.MainHeader.Content.add(<ConnectedDeviceCounter key="devices"/>)

    this.flex.Actions.addListener("beforeLogout", this.removeCurrentDeviceToken.bind(this))
    await this.setupSync();
  },

  getCurrentDeviceToken() {
    if (localStorage.getItem(`${deviceTokenKEy}__${this.state.worker.worker.sid}`)) {
      return localStorage.getItem(`${deviceTokenKEy}__${this.state.worker.worker.sid}`)
    } else {
      const t = uuidv4()
      localStorage.setItem(`${deviceTokenKEy}__${this.state.worker.worker.sid}`, t)
      return t
    }
  },

  removeCurrentDeviceToken() {
    localStorage.removeItem(`${deviceTokenKEy}__${this.state.worker.worker.sid}`);
  },

  async clearMap() {
    await this.devicesMap.removeMap();
    window.location.reload();
  },

  setupRedux() {
    this.manager.store.addReducer('devices', reducer)
  },

  async setupSync() {
    this.state = this.manager.store.getState().flex;
    this.token = this.state.session.ssoTokenPayload.token;

    this.client = new SyncClient(this.token)
    this.devicesMap = await this.client.map(`devices_${this.state.worker.worker.sid}`)

    const devicesMapItems = await this.devicesMap.getItems()
    const devicesIds = devicesMapItems.items.map(extractID)

    this.manager.store.dispatch({
      type: ADD_DEVICES,
      payload: Object.keys(devicesIds).map(key => devicesIds[key]),
    })

    this.devicesMap.on('itemAdded', (deviceItem) => {
      this.manager.store.dispatch({
        type: UPDATE_DEVICE,
        payload: deviceItem.item.descriptor.key,
      })
    })

    this.devicesMap.on('itemUpdated', (deviceItem) => {
      this.manager.store.dispatch({
        type: UPDATE_DEVICE,
        payload: deviceItem.item.descriptor.key,
      });
    })

    this.devicesMap.on('itemRemoved', ({ key }) => {
      if (key === this.getCurrentDeviceToken()) {
        this.flex.Actions.invokeAction("Logout", {
          forceLogout: true,
          activitySid: this.state.worker.activity.sid,
        });
      }

      this.manager.store.dispatch({
        type: REMOVE_DEVICE,
        payload: key,
      });
    })

    await this.devicesMap.set(this.getCurrentDeviceToken(), {
      started: new Date().toLocaleString(),
      details: UAParser(navigator)
    })
  },

  logoutDevice(deviceKey) {
    this.devicesMap.remove(deviceKey);
  }
}

const ADD_DEVICES = 'ADD_DEVICES_BM'
const UPDATE_DEVICE = 'UPDATE_DEVICE_BM'
const REMOVE_DEVICE = 'REMOVE_DEVICE_BM'

const reducer = (state, action) => {
  switch (action.type) {
    case ADD_DEVICES:
      return [...action.payload]
    case UPDATE_DEVICE:
      return state.includes(action.payload) ? state : [...state, action.payload]
    case REMOVE_DEVICE:
      return state.filter(item => item !== action.payload)
    default:
      return state
  }
}

const OuterBox = styled("div")`
  margin-left: auto;
`
const InnerBox = styled("div")`
  background: ${p => p.theme.colors.base2};
  width: 200px;
  color: ${p => p.theme.calculated.textColor};
  padding: 5px;
  margin-top: 10px;
  box-shadow: 0 1px 2px 0px rgba(0,0,0,0.2);
  animation: opla 0.2s forwards;
  @keyframes opla {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`
const Title = styled("p")`
  font-weight: bold;
  margin-bottom: 4px;
  margin-top: 0;
`


const DeviceCounter = ({ devices }) => {
  return (
    <OuterBox>
      <ModalPopupWithEntryControl
        className="DevicesList"
        alignRight
        entryControl={
          <IconButton icon="info" />
        }
      >
      <InnerBox>
        {devices && !!devices.length && <>
          <Title>Devices</Title>
          {devices.map(dv => (
            <button type="button" onClick={() => stuff.logoutDevice(dv)}>{dv} !!! </button>
          ))}
        </>}
      </InnerBox>
      </ModalPopupWithEntryControl>
    </OuterBox>
  )
}

const ConnectedDeviceCounter = connect((state) => {
  return {
    devices: state.devices,
  }
})(DeviceCounter)


