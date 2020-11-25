const mqtt = require('mqtt');

class HomeAssistantMQTT {
    constructor(server, options, bridgeTopic) {
        this.mqttPublishPersistentOptions = { qos: 2, retain: true };
        this.mqttPublishVolatileOptions = { qos: 2, retain: false };
        this.mqttClient = mqtt.connect(server, options);
        this.devices = [];
        this.bridgeTopic = bridgeTopic;

        console.info(`start mqtt connection: "${server}"`);
        this.mqttClient.on('connect', () => {
            console.info(`Succesfully connected to MQTT Server: "${server}"`);
            this.processMQTTBridge();
        });
    }

    processMQTTBridge() {
        this.mqttClient.subscribe(`${this.bridgeTopic}/bridge/#`, (subscribeError) => {
            if (!subscribeError) {
                console.info('Succesfully subscribed to bridge:');

                this.mqttClient.on('message', (topic, message) => {
                    console.info(`bridge received message topic: "${topic}" - message: "${message}"`);
                    if (topic === `${this.bridgeTopic}/devices`) {
                        //listen to this topic only if the devices is empty and fill with retained devices
                        if (this.devices === undefined || this.devices.length == 0) {
                            var bridgeDevices = JSON.parse(message);
                            console.info(`Bridge devices found : "${message}"`);
                            for (var d in bridgeDevices) {
                                this.devices.push(bridgeDevices[d]);
                            }
                        }
                    }
                    //Device announcement
                    if (topic === `${this.bridgeTopic}/bridge/announce`) {
                        var device = JSON.parse(message);
                        var existingDevice = this.devices.find(d => d._id === device._id)
                        if (existingDevice) {
                            // console.info(`Publish device state for message : "${device}"`);
                            this.publishDeviceState(device); //device exists so only publish the state
                        }
                        else {
                            //device don't exists publish configuration, state and add to bridge devices
                            this.devices.push(device);
                            // console.info(`Publish device configuration for message : "${device}"`);
                            this.publishDeviceConfiguration(device);
                            // console.info(`Publish device state for message : "${device}"`);
                            this.publishDeviceState(device);
                            // console.info(`Publish devices : "${devices}"`)
                            this.publishMQTTmessage(`${this.bridgeTopic}/bridge/devices`, this.devices, this.mqttPublishPersistentOptions);
                        }

                    }
                })
            } else console.error(`Subscribe to bridge error: ${subscribeError}`)
        }
        )
    }

    publishMQTTmessage(topic, payload, options) {
        this.mqttClient.subscribe(topic, (subscribeError) => {
            if (!subscribeError) {
                // console.info(`Succesfully subscribed to topic: "${topic}"`);
                this.mqttClient.publish(topic, JSON.stringify(payload), options, (publishError) => {
                    if (!publishError) {
                        // console.info(`Succesfully published to topic: "${topic}" payload: "${JSON.stringify(payload)} with options: "${JSON.stringify(options)}"`);
                        this.mqttClient.unsubscribe(topic, (unsubscribeError) => {
                            if (!unsubscribeError) {
                                // console.info(`Succesfully unsubscribed from topic: "${topic}"`);
                            }
                            else console.error(`Unsubscribe error: ${unsubscribeError}`);
                        });
                    }
                    else console.error(`Publish error: ${publishError}`);
                })
            }
            else console.error(`Subscribe error: ${subscribeError}`);
        })
    }

    publishDeviceConfiguration(device) {
        var deviceId = device._id;
        var publishDevice = {
            identifiers: [deviceId],
            manufacturer: "SpeedTest by Ookla",
            name: device.name,
        }

        if (device.data.speeds) {
            //Download
            var topic = `homeassistant/sensor/${deviceId}/download/config`;
            var payload = {
                device: publishDevice,
                name: `${device.name} Download`,
                // device_class: metric.label.toLowerCase(),
                icon: 'mdi:speedometer',
                state_topic: `${this.bridgeTopic}/${deviceId}`,
                unique_id: `${deviceId}_download`,
                unit_of_measurement: 'Mbps',
                value_template: `{{ value_json.download }}`
            };
            this.publishMQTTmessage(topic, payload, this.mqttPublishPersistentOptions);
            //Upload
            topic = `homeassistant/sensor/${deviceId}/upload/config`;
            payload = {
                device: publishDevice,
                name: `${device.name} Upload`,
                // device_class: metric.label.toLowerCase(),
                icon: 'mdi:speedometer',
                state_topic: `${this.bridgeTopic}/${deviceId}`,
                unique_id: `${deviceId}_upload`,
                unit_of_measurement: 'Mbps',
                value_template: `{{ value_json.upload }}`
            };
            this.publishMQTTmessage(topic, payload, this.mqttPublishPersistentOptions);
        }
        if (device.data.ping) {
            //Ping
            var topic = `homeassistant/sensor/${deviceId}/ping/config`;
            var payload = {
                device: publishDevice,
                name: `${device.name} Ping`,
                // device_class: metric.label.toLowerCase(),
                icon: 'mdi:speedometer',
                state_topic: `${this.bridgeTopic}/${deviceId}`,
                unique_id: `${deviceId}_ping`,
                unit_of_measurement: 'ms',
                value_template: `{{ value_json.ping }}`
            };
            this.publishMQTTmessage(topic, payload, this.mqttPublishPersistentOptions);
        }
    }

    publishDeviceState(device) {
        var deviceId = device._id;
        var topic = `${this.bridgeTopic}/${deviceId}`;

        var state = {};
        if (device.data.speeds) {
            state = { ...state, download: device.data.speeds.download.toFixed(1), upload: device.data.speeds.upload.toFixed(1) };
        }
        if (device.data.ping) {
            state = { ...state, ping: device.data.ping };
        }

        this.publishMQTTmessage(topic, state, this.mqttPublishVolatileOptions);
    }

    publishDeviceAnnouncement(device) {
        this.publishMQTTmessage(`${this.bridgeTopic}/bridge/announce`, device, this.mqttPublishVolatileOptions);
    }
}

module.exports = HomeAssistantMQTT;