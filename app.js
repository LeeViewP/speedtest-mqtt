const mqttServer = process.env.MQTT_SERVER; //'mqtt://192.168.1.190';
const mqttServerPort = process.env.MQTT_PORT;// '1883';
const mqttServerOptions = { username: process.env.USERNAME, password: process.env.PASSWORD };

const HomeAssistantMQTT = require('./hassioMQTT');
const { testSpeed } = require('speedtest-promise');
const minutes = 5;
const seconds = 10;
var interval = (minutes * 60 + seconds) * 1000;

mqttClient = new HomeAssistantMQTT(`${mqttServer}:${mqttServerPort}`, mqttServerOptions, "speedtest/bridge")
console.log("app started");
(function runSpeedTest(){
testSpeed().then(data => {
    var device = {
        _id: "AB126049-0C2A-4BBB-A8C0-30105E760AC2",
        name: 'Internet Speed Test',
        data: data
    };
    console.info(JSON.stringify(device))
    mqttClient.publishDeviceAnnouncement(device);
}).catch(err => console.error('SPEEDTEST-NET FAILED: ' + err.toString()));
 setTimeout(runSpeedTest, interval);
})();
console.log("app ended");