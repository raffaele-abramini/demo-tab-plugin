import { SyncClient } from 'twilio-sync'
import uuidv4 from 'uuid/v4'
import React from 'react'
import { connect } from 'react-redux'
import { ModalPopupWithEntryControl, IconButton, styled } from '@twilio/flex-ui';
import UAParser from 'ua-parser-js';

const formatDevicePayload = (acc, item) => {
  const { descriptor } = item;
  acc[descriptor.key] = {
    key: descriptor.key,
    ...descriptor.data
  }

  return acc;
}
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
    // const devicesIds = devicesMapItems.items.map(extractID)

    this.manager.store.dispatch({
      type: ADD_DEVICES,
      payload: devicesMapItems.items.reduce(formatDevicePayload, {}),
    })

    this.devicesMap.on('itemAdded', this.handleItemUpdated.bind(this))
    this.devicesMap.on('itemUpdated', this.handleItemUpdated.bind(this))

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

    const { browser, os, device } = UAParser(navigator);

    await this.devicesMap.set(this.getCurrentDeviceToken(), {
      started: new Date().toLocaleString(),
      details: {
        browser: browser.name,
        os: os.name,
        device: device.model,
      }
    })
  },

  logoutDevice(deviceKey) {
    this.devicesMap.remove(deviceKey);
  },

  handleItemUpdated(deviceItem) {
    const { descriptor } = deviceItem.item;
    this.manager.store.dispatch({
      type: UPDATE_DEVICE,
      payload: {
        key: descriptor.key,
        ...descriptor.data
      },
    });
  }
}

const ADD_DEVICES = 'ADD_DEVICES_BM'
const UPDATE_DEVICE = 'UPDATE_DEVICE_BM'
const REMOVE_DEVICE = 'REMOVE_DEVICE_BM'

const reducer = (state = {}, action) => {
  switch (action.type) {
    case ADD_DEVICES:
      return {...action.payload}
    case UPDATE_DEVICE:
      return state[action.payload.key] ? state : {...state, [action.payload.key]: action.payload}
    case REMOVE_DEVICE:
      const {[action.payload] : removedItem, ...rest} = state;
      return rest;
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
  padding: 12px 12px 4px;
  margin-top: 10px;
  box-shadow: 0 1px 2px 0 rgba(0,0,0,0.2);
  animation: opla 0.2s forwards;
  @keyframes opla {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`
const Title = styled("p")`
  font-weight: bold;
  margin-bottom: 12px;
  margin-top: 0;
`

const DeviceRow = styled("div")`
  display: flex;
  padding: 4px 0;
  
  & + & {
    margin-top: 4px;
    border-top: 1px solid ${p => p.theme.colors.base2};
  }
`
const DeviceRowDetail = styled("div")`
  padding-right: 4px;
  margin-right: auto;
`

const LogoutDeviceBtn = styled(IconButton)`
  flex-shrink: 0;
  background: ${p => p.theme.colors.notificationIconColorError};
  color: white;
`


const PopupContent = ({ devices }) => {
  return (
    <InnerBox>
      {
        !devices || !Object.keys(devices).length
          ? (
            <Title>No other devices logged in!&nbsp; 🎉</Title>
          )
          : <>
              <Title>Other devices logged in:</Title>
              {Object.keys(devices).map(dv => {
                const { details, started } = devices[dv];
                return (
                  <DeviceRow key={dv}>
                    <DeviceRowDetail>
                      <p>{details.browser} | {details.os}</p>
                      <p>{started}</p>
                    </DeviceRowDetail>
                    <LogoutDeviceBtn icon="Logout" onClick={() => stuff.logoutDevice(dv)} title="Logout device" />
                  </DeviceRow>
                )
              })}
            </>
      }
    </InnerBox>
  )
};
const DeviceCounter = ({ devices }) => {
  return (
    <OuterBox>
      <ModalPopupWithEntryControl
        className="DevicesList"
        alignRight
        entryControl={
          <IconButton icon="Agents" />
        }
      >
      <PopupContent devices={devices} />
      </ModalPopupWithEntryControl>
    </OuterBox>
  )
}

const ConnectedDeviceCounter = connect((state) => {
  const {[stuff.getCurrentDeviceToken()] : currentDevice, ...rest} = state.devices;
  return {
    devices: rest,
  }
})(DeviceCounter)


