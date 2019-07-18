import React from 'react';
import { FlexPlugin } from 'flex-plugin';
import MyNewTabComponent from './NewTabComponent';
import MyNewOtherTabComponent from './MyNewOtherTabComponent';
import { stuff } from './SynStuff';

const PLUGIN_NAME = 'DemoPlugin';

export default class DemoPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  init(flex, manager) {
    const Tab = flex.Tab;
    flex.TaskCanvasTabs.Content.add(<Tab uniqueName="customTabOne" key="key-to-my-tab"><MyNewTabComponent/></Tab>);
    flex.TaskCanvasTabs.Content.add(<Tab uniqueName="customTabTwo" key="key-to-my-other-tab"><MyNewOtherTabComponent/></Tab>);

    stuff.bootstrap(manager)
  }
}
