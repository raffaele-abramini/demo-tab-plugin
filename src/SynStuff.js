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
  margin-top: 2px;
`
const InnerBox = styled("div")`
  background: ${p => p.theme.colors.base2};
  width: 220px;
  color: ${p => p.theme.calculated.textColor};
  padding: 12px 12px 8px;
  margin-top: 9px;
  box-shadow: 0 1px 2px 0 rgba(0,0,0,0.2);
  animation: fadn 0.15s forwards;

  @keyframes fadn {
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
  padding: 8px 0 4px; 
  margin-top: 6px;
  border-top: 1px solid ${p => p.theme.colors.base4};
`
const DeviceRowDetail = styled("div")`
  padding-right: 4px;
  margin-right: auto;
  font-size: 11px;
`

const setBg  = (p) => {
  const bg = p.theme.colors.notificationIconColorError;
  return `linear-gradient(${bg}, ${bg})`;
}

const LogoutDeviceBtn = styled(IconButton)`
  flex-shrink: 0;
  background-image: ${setBg};
  color: white;

  svg {
     width: 20px;
     height: 20px;
  }
`


const PopupContent = ({ devices, refs }) => {
  const handleLogout = (deviceKey) => {
    stuff.logoutDevice(deviceKey);
    setTimeout(() => refs.modal.hide(), 1000);
  }

  return (
    <InnerBox>
      {
        !devices || !Object.keys(devices).length
          ? (
            <Title>This is the only device you're logged in!&nbsp; 🎉</Title>
          )
          : <>
              <Title>You're logged in other devices 🤔</Title>
              {Object.keys(devices).map(deviceKey => {
                const { details, started } = devices[deviceKey];
                return (
                  <DeviceRow key={deviceKey}>
                    <DeviceRowDetail>
                      <p>{details.browser} | {details.os}</p>
                      <p>{started}</p>
                    </DeviceRowDetail>
                    <LogoutDeviceBtn
                      icon="Logout"
                      onClick={() => handleLogout(deviceKey)}
                      title="Logout device"
                    />
                  </DeviceRow>
                )
              })}
            </>
      }
    </InnerBox>
  )
};
const DeviceCounter = ({ devices }) => {
  const refs = {};

  const setModalRef = (element) => {
    refs.modal = element || refs.modal;
  };

  return (
    <OuterBox>
      <ModalPopupWithEntryControl
        className="DevicesList"
        alignRight
        autoClose
        entryControl={
          <IconButton icon={!devices || !Object.keys(devices).length ? "Agents" : "AgentsBold"} />
        }
        ref={setModalRef}
      >
      <PopupContent devices={devices} refs={refs} />
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


