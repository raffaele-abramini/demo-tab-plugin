import { SyncClient } from 'twilio-sync'
import uuidv4 from 'uuid/v4'
import React from 'react'
import { connect } from 'react-redux'

const getByID = (id) => (item) => item.key === id
const extractID = (item) => item.descriptor.key
const deviceTokenKEy = 'devideToke'

export const stuff = {
  async bootstrap(flex, manager) {
    this.manager = manager;
    this.setupRedux();
    flex.MainHeader.Content.add(<ConnectedDeviceCounter key="devices"/>)

    await this.setupSync();
  },

  getDeviceToken() {
    if (localStorage.getItem(`${deviceTokenKEy}__${this.state.worker.worker.sid}`)) {
      return localStorage.getItem(`${deviceTokenKEy}__${this.state.worker.worker.sid}`)
    } else {
      const t = uuidv4()
      localStorage.setItem(`${deviceTokenKEy}__${this.state.worker.worker.sid}`, t)
      return t
    }
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

    const items = await this.devicesMap.getItems()
    const thing = items.items.map(extractID)

    console.warn(items);

    this.manager.store.dispatch({
      type: ADD_DEVICES,
      payload: Object.keys(thing).map(key => thing[key]),
    })

    this.devicesMap.on('itemAdded', (item) => {
      this.manager.store.dispatch({
        type: UPDATE_DEVICE,
        payload: item.item.descriptor.key,
      })
    })
    this.devicesMap.on('itemUpdated', (item) => {
      this.manager.store.dispatch({
        type: UPDATE_DEVICE,
        payload: item.item.descriptor.key,
      })
    })
    this.devicesMap.on('itemRemoved', (item) => {
      this.manager.store.dispatch({
        type: REMOVE_DEVICE,
        payload: item.item.descriptor.key,
      })
    })
    await this.devicesMap.set(this.getDeviceToken(), {})
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


const DeviceCounter = ({ devices }) => {
  console.warn('devices', devices)
  return (
    <div>
      <button type="button" onClick={() => stuff.clearMap()}>clear</button>
      {devices && !!devices.length && <>Devices {devices.map(dv => <span>{dv} !!! </span>)}</>}
    </div>
  )
}

const ConnectedDeviceCounter = connect((state) => {
  return {
    devices: state.devices,
  }
})(DeviceCounter)


