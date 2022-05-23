const LitElement = Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const includeDomains = ["fan"];


function fireEvent(ev, detail, entity = null) {
    ev = new Event(ev, {
        bubbles: true,
        cancelable: false,
        composed: true,
    });
    ev.detail = detail || {};
    if (entity) {
        entity.dispatchEvent(ev);
    } else {
        var root = lovelace_view();
        if (root) root.dispatchEvent(ev);
    }
}

function moreInfo(entity, large = false) {
    const root =
        document.querySelector("hc-main") ||
        document.querySelector("home-assistant");
    fireEvent("hass-more-info", { entityId: entity }, root);
    const el = root._moreInfoEl;
    el.large = large;
    return el;
}

const OptionsPlatform = [
    'default',
    'xiaomi_miio_fan',
];

const defaultConfig = {
    name: "",
    platform: OptionsPlatform[0],
    entity: "fan.fan",
    disable_animation: false,
    force_sleep_mode_support: false,
    hide_led_button: false
}

class FanXiaomi extends HTMLElement {

    static getConfigElement() {
        return document.createElement("content-card-editor");
    }

    static getStubConfig() {
        return {
            ...defaultConfig,
            name: "Xiaomi Fan",
        };
    }

    supportedAttributes = {
        angle: true, childLock: true, timer: true, rotationAngle: true, speedLevels: 4,
        naturalSpeed: true, supportedAngles: [30, 60, 90, 120], sleepMode: false, led: false, buzzer: false, ionizer: false, ledBrightness: false
    }

    entityFilters = {
        angle: {
            prefix: 'number.',
            suffix: '_oscillation_angle'
        },
        childLock: {
            prefix: 'switch.',
            suffix: '_child_lock'
        },
        timer: {
            prefix: 'number.',
            suffix: '_delay_off_countdown'
        },
        ledNumber: {
            prefix: 'number.',
            suffix: '_led_brightness'
        },
        ledSelect: {
            prefix: 'select.',
            suffix: '_led_brightness'
        },
        ledSwitch: {
            prefix: 'switch.',
            suffix: '_led'
        },
        buzzerSwitch: {
            prefix: 'switch.',
            suffix: '_buzzer'
        },
        ionizerSwitch: {
            prefix: 'switch.',
            suffix: '_ionizer'
        },
        temperature: {
            prefix: 'sensor.',
            suffix: '_temperature'
        },
        humidity: {
            prefix: 'sensor.',
            suffix: '_humidity'
        },
        powerSupply: {
            prefix: 'binary_sensor.',
            suffix: '_power_supply'
        }
    }

    getAuxEntity(entities, entityFilter) {
        return entities.find(e => e.entity_id.startsWith(entityFilter['prefix']) && e.entity_id.endsWith(entityFilter['suffix']));
    }

    getModel(hass) {
        if (this.config.platform === 'default') {
            return null
        }
        return hass.states[this.config.entity].attributes['model']
    }

    setChildLock(hass, on) {
        if (this.childLockEntity) {
            hass.callService('switch', on ? 'turn_on' : 'turn_off', {
                entity_id: this.childLockEntity,
            });
        } else {
            hass.callService(this.config.platform, on ? 'fan_set_child_lock_on' : 'fan_set_child_lock_off');
        }
    }

    getChildLock(hass) {
        if (this.childLockEntity) {
            return hass.states[this.childLockEntity].state === 'on';
        }
        return hass.states[this.config.entity].attributes['child_lock'];
    }

    setTimer(hass, value) {
        if (this.delayOffEntity) {
            hass.callService('number', 'set_value', {
                entity_id: this.delayOffEntity,
                value: value
            });
        } else {
            hass.callService(this.config.platform, 'fan_set_delay_off', {
                entity_id: this.config.entity,
                delay_off_countdown: value
            });
        }
    }

    getTimer(hass) {
        if (this.delayOffEntity) {
            return hass.states[this.delayOffEntity].state;
        }
        return hass.states[this.config.entity].attributes['delay_off_countdown'];
    }

    setAngle(hass, value) {
        if (this.oscillationAngleEntity) {
            hass.callService('number', 'set_value', {
                entity_id: this.oscillationAngleEntity,
                value: value
            });
        } else {
            hass.callService(this.config.platform, 'fan_set_oscillation_angle', {
                entity_id: this.config.entity,
                angle: value
            });
        }
    }

    getAngle(hass) {
        if (this.oscillationAngleEntity) {
            return Number(hass.states[this.oscillationAngleEntity].state);
        }
        return hass.states[this.config.entity].attributes['angle'];
    }

    setOscillation(hass, on) {
        hass.callService('fan', 'oscillate', {
            entity_id: this.config.entity,
            oscillating: on
        });
    }

    getOscillation(hass) {
        return hass.states[this.config.entity].attributes['oscillating'];
    }

    setSpeedPercentage(hass, value) {
        hass.callService('fan', 'set_percentage', {
            entity_id: this.config.entity,
            percentage: value
        });
    }

    getSpeedPercentage(hass) {
        return hass.states[this.config.entity].attributes['percentage'];
    }

    setSpeedLevel(hass, value) {
        let speedPercentage = value / this.supportedAttributes.speedLevels * 100
        this.setSpeedPercentage(hass, speedPercentage)
    }

    getSpeedLevel(hass) {
        let speedPercentage = this.getSpeedPercentage(hass)
        return Math.round(speedPercentage / 100 * this.supportedAttributes.speedLevels)
    }

    setPresetMode(hass, value) {
        if (this.config.platform === 'default') {
            hass.callService('fan', 'set_preset_mode', {
                entity_id: this.config.entity,
                preset_mode: value
            });
        } else {
            if (value === 'Nature') {
                hass.callService(this.config.platform, 'fan_set_natural_mode_on', {
                    entity_id: this.config.entity
                });
            } else {
                hass.callService(this.config.platform, 'fan_set_natural_mode_off', {
                    entity_id: this.config.entity
                });
            }
        }
    }

    getPresetMode(hass) {
        const attrs = hass.states[this.config.entity].attributes;
        if (this.config.platform === 'default') {
            return attrs['preset_mode'];
        }
        return attrs['mode'];
    }

    setLed(hass, on) {
        if (this.numberLedEntity) {
            hass.callService('number', 'set_value', {
                entity_id: this.numberLedEntity,
                value: on ? 100 : 0
            });
        } else if (this.selectLedEntity) {
            hass.callService('select', 'select_option', {
                entity_id: this.selectLedEntity,
                option: on ? 'bright' : 'off'
            });
        } else if (this.switchLedEntity) {
            if (on) {
                hass.callService('switch', 'turn_on', {
                    entity_id: this.switchLedEntity,
                });
            } else {
                hass.callService('switch', 'turn_off', {
                    entity_id: this.switchLedEntity,
                });
            }
        } else {
            hass.callService(this.config.platform, on ? 'fan_set_led_on' : 'fan_set_led_off', {
                entity_id: this.config.entity
            });
        }
    }

    getLed(hass) {
        if (this.numberLedEntity) {
            return hass.states[this.numberLedEntity].state > 0;
        } else if (this.selectLedEntity) {
            return hass.states[this.selectLedEntity].state !== 'off';
        } else if (this.switchLedEntity) {
            return hass.states[this.switchLedEntity].state === 'on';
        }
        return hass.states[this.config.entity].attributes['led_brightness'] < 2;
    }

    setLedBrightness(hass, brightness) {
        if (this.numberLedEntity) {
            hass.callService('number', 'set_value', {
                entity_id: this.numberLedEntity,
                value: brightness
            });
        }
    }

    getLedBrightness(hass) {
        if (this.numberLedEntity) {
            return Math.floor(hass.states[this.numberLedEntity].state);
        }
        return 100;
    }

    setBuzzer(hass, on) {
        if (this.switchBuzzerEntity) {
            if (on) {
                hass.callService('switch', 'turn_on', {
                    entity_id: this.switchBuzzerEntity,
                });
            } else {
                hass.callService('switch', 'turn_off', {
                    entity_id: this.switchBuzzerEntity,
                });
            }
        }
    }

    getBuzzer(hass) {
        if (this.switchBuzzerEntity) {
            return hass.states[this.switchBuzzerEntity].state === 'on';
        }
    }

    setIonizer(hass, on) {
        if (this.switchIonizerEntity) {
            if (on) {
                hass.callService('switch', 'turn_on', {
                    entity_id: this.switchIonizerEntity,
                });
            } else {
                hass.callService('switch', 'turn_off', {
                    entity_id: this.switchIonizerEntity,
                });
            }
        }
    }

    getIonizer(hass) {
        if (this.switchIonizerEntity) {
            return hass.states[this.switchIonizerEntity].state === 'on';
        }
    }

    getTemperature(hass) {
        if (this.temperatureEntity) {
            return hass.states[this.temperatureEntity].state;
        }
    }

    getHumidity(hass) {
        if (this.humidityEntity) {
            return hass.states[this.humidityEntity].state;
        }
    }

    getPowerSupply(hass) {
        if (this.powerSupplyEntity) {
            return hass.states[this.powerSupplyEntity].state === 'on';
        }
    }

    set hass(hass) {
        // Store most recent `hass` instance so we can update in the editor preview.
        // This should only be used in setConfig()
        this.mostRecentHass = hass;

        if (this.configuring) return;

        if (!this.card) {
            this.configuring = true;
            this.configureAsync(hass)
                .then(() => {
                    this.createCard(hass);
                    this.updateUI(hass);
                    this.configuring = false;
                });
        } else {
            this.updateUI(hass);
        }
    }

    checkFanFeatures(attributes) {
        if (attributes.preset_mode && attributes.preset_modes && attributes.preset_modes.includes("Nature")) {
            this.supportedAttributes.naturalSpeed = true;
        }
    }

    checkFanAuxFeatures(hass, deviceEntities) {
        const oscillationEntity = this.getAuxEntity(deviceEntities, this.entityFilters['angle']);
        if (oscillationEntity) {
            this.oscillationAngleEntity = oscillationEntity.entity_id;
            this.supportedAttributes.angle = true;
            const attr = hass.states[this.oscillationAngleEntity].attributes;
            if (attr.min && attr.max && attr.step) {
                const angles = [];
                for (let a = attr.min; a <= attr.max; a += attr.step) {
                    angles.push(a);
                }
                this.supportedAttributes.supportedAngles = angles;
            }
        }

        const delayEntity = this.getAuxEntity(deviceEntities, this.entityFilters['timer']);
        if (delayEntity) {
            this.delayOffEntity = delayEntity.entity_id;
            this.supportedAttributes.timer = true;
        }

        const childLockEntity = this.getAuxEntity(deviceEntities, this.entityFilters['childLock']);
        if (childLockEntity) {
            this.childLockEntity = childLockEntity.entity_id;
            this.supportedAttributes.childLock = true;
        }

        const numberLedEntity = this.getAuxEntity(deviceEntities, this.entityFilters['ledNumber']);
        if (numberLedEntity) {
            this.numberLedEntity = numberLedEntity.entity_id;
            this.supportedAttributes.led = true;
            this.supportedAttributes.ledBrightness = true;
        }

        const selectLedEntity = this.getAuxEntity(deviceEntities, this.entityFilters['ledSelect']);
        if (selectLedEntity) {
            this.selectLedEntity = selectLedEntity.entity_id;
            this.supportedAttributes.led = true;
        }

        const switchLedEntity = this.getAuxEntity(deviceEntities, this.entityFilters['ledSwitch']);
        if (switchLedEntity) {
            this.switchLedEntity = switchLedEntity.entity_id;
            this.supportedAttributes.led = true;
        }

        const switchBuzzerEntity = this.getAuxEntity(deviceEntities, this.entityFilters['buzzerSwitch']);
        if (switchBuzzerEntity) {
            this.switchBuzzerEntity = switchBuzzerEntity.entity_id;
            this.supportedAttributes.buzzer = true;
        }

        const switchIonizerEntity = this.getAuxEntity(deviceEntities, this.entityFilters['ionizerSwitch']);
        if (switchIonizerEntity) {
            this.switchIonizerEntity = switchIonizerEntity.entity_id;
            this.supportedAttributes.ionizer = true;
        }
    }

    checkFanAuxSensors(deviceEntities) {
        const tempSensorEntity = this.getAuxEntity(deviceEntities, this.entityFilters['temperature']);
        if (tempSensorEntity) {
            this.temperatureEntity = tempSensorEntity.entity_id;
        }

        const humiditySensorEntity = this.getAuxEntity(deviceEntities, this.entityFilters['humidity']);
        if (humiditySensorEntity) {
            this.humidityEntity = humiditySensorEntity.entity_id;
        }

        const powerSupplyEntity = this.getAuxEntity(deviceEntities, this.entityFilters['powerSupply']);
        if (powerSupplyEntity) {
            this.powerSupplyEntity = powerSupplyEntity.entity_id;
        }
    }

    async configureAsync(hass) {
        if (this.config.platform === 'default') {
            const fanEntity = hass.states[this.config.entity];
            if (!fanEntity) {
                return;
            }
            const attributes = fanEntity.attributes;
            const allEntities = await hass.callWS({ type: "config/entity_registry/list" });
            const fanApiEntity = allEntities.find(e => e.entity_id === this.config.entity);
            if (!fanApiEntity) {
                return;
            }
            const deviceEntities = allEntities.filter(e => e.device_id === fanApiEntity.device_id);
            this.checkFanFeatures(attributes);
            this.checkFanAuxFeatures(hass, deviceEntities);
            this.checkFanAuxSensors(deviceEntities);
        } else {
            const state = hass.states[this.config.entity];
            const attrs = state.attributes;

            if (['dmaker.fan.p15'].includes(attrs['model'])) {
                this.supportedAttributes.supportedAngles = [30, 60, 90, 120, 140];
                //this.supportedAttributes.led = true;
            }

            //temp solution for FA1 fan until proper fan support is added in the upstream
            if (['zhimi.fan.fa1'].includes(attrs['model'])) {
                this.supportedAttributes.speedIncreaseDecreaseButtons = true;
                this.supportedAttributes.angle = false;
                this.supportedAttributes.childLock = false;
                this.supportedAttributes.rotationAngle = false;
                this.supportedAttributes.speedLevels = 3;
                this.supportedAttributes.naturalSpeed = false;
                this.supportedAttributes.timer = false;
            }
            if (['leshow.fan.ss4'].includes(attrs['model'])) {
                this.supportedAttributes.angle = false;
                this.supportedAttributes.childLock = false;
                this.supportedAttributes.rotationAngle = false;
                this.supportedAttributes.naturalSpeed = false;
                this.supportedAttributes.sleepMode = true;
            }

            if (this.config.force_sleep_mode_support) {
                this.supportedAttributes.sleepMode = true;
            }
        }
    }

    createCard(hass) {
        const state = hass.states[this.config.entity];
        const entityId = this.config.entity;
        const ui = this.getUI();
        const card = document.createElement('ha-card');
        card.className = 'fan-xiaomi'
        card.appendChild(ui)

        // Check if fan is disconnected
        if (state === undefined || state.state === 'unavailable') {
            card.classList.add('offline');
            this.card = card;
            this.appendChild(card);
            ui.querySelector('.var-title').textContent = this.config.name + ' (Disconnected)';
            return;
        }

        // Angle adjustment event bindings
        ui.querySelector('.left').onmouseover = () => {
            ui.querySelector('.left').classList.replace('hidden', 'show')
        }
        ui.querySelector('.left').onmouseout = () => {
            ui.querySelector('.left').classList.replace('show', 'hidden')
        }
        ui.querySelector('.left').onclick = () => {
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                this.log('Rotate left 5 degrees')
                hass.callService('fan', 'set_direction', {
                    entity_id: entityId,
                    direction: this.config.platform === 'default' ? "reverse" : "left"
                });
            }
        }
        ui.querySelector('.right').onmouseover = () => {
            ui.querySelector('.right').classList.replace('hidden', 'show')
        }
        ui.querySelector('.right').onmouseout = () => {
            ui.querySelector('.right').classList.replace('show', 'hidden')
        }
        ui.querySelector('.right').onclick = () => {
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                this.log('Rotate right 5 degrees')
                hass.callService('fan', 'set_direction', {
                    entity_id: entityId,
                    direction: this.config.platform === 'default' ? "forward" : "right"
                });
            }
        }

        // Power toggle event bindings
        ui.querySelector('.c1').onclick = () => {
            this.log('Toggle')
            hass.callService('fan', 'toggle', {
                entity_id: entityId
            });
        }

        // Fan speed toggle event bindings
        ui.querySelector('.var-speed').onclick = () => {
            this.log('Speed Level')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                //let blades = ui.querySelector('.fanbox .blades')
                let u = ui.querySelector('.var-speed')
                //let iconSpan = u.querySelector('.icon-waper')
                let icon = u.querySelector('.icon-waper > ha-icon').getAttribute('icon')
                let newSpeedLevel

                let maskSpeedLevel = /mdi:numeric-(\d)-box-outline/g
                let speedLevelMatch = maskSpeedLevel.exec(icon)
                let speedLevel = parseInt(speedLevelMatch ? speedLevelMatch[1] : 1)
                newSpeedLevel = speedLevel + 1
                if (newSpeedLevel > this.supportedAttributes.speedLevels) {
                    newSpeedLevel = 1
                }

                this.log(`Set speed to: ${newSpeedLevel}`)
                this.setSpeedLevel(hass, newSpeedLevel);
            }
        }

        // Increase/Decrease speed level
        ui.querySelector('.var-speedup').onclick = () => {
            this.log('Speed Up');
            hass.callService('fan', 'increase_speed', {
                entity_id: entityId
            });
        }
        ui.querySelector('.var-speeddown').onclick = () => {
            this.log('Speed Up');
            hass.callService('fan', 'decrease_speed', {
                entity_id: entityId
            });
        }

        // Fan angle toggle event bindings
        ui.querySelector('.button-angle').onclick = () => {
            this.log('Oscillation Angle')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let b = ui.querySelector('.button-angle');
                if (!b.classList.contains('loading')) {
                    let u = ui.querySelector('.var-angle');
                    let oldAngleText = u.innerHTML;
                    let newAngle;
                    let curAngleIndex = this.supportedAttributes.supportedAngles.indexOf(parseInt(oldAngleText, 10));
                    if (curAngleIndex >= 0 && curAngleIndex < this.supportedAttributes.supportedAngles.length - 1) {
                        newAngle = this.supportedAttributes.supportedAngles[curAngleIndex + 1];
                    } else {
                        newAngle = this.supportedAttributes.supportedAngles[0];
                    }
                    b.classList.add('loading');

                    this.log(`Set angle to: ${newAngle}`);
                    this.setAngle(hass, newAngle);
                }
            }
        }

        // Timer toggle event bindings
        ui.querySelector('.button-timer').onclick = () => {
            this.log('Timer');
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let b = ui.querySelector('.button-timer')
                if (!b.classList.contains('loading')) {
                    let u = ui.querySelector('.var-timer');

                    let currTimer;
                    let hoursRegex = /(\d)h/g;
                    let minsRegex = /(\d{1,2})m/g;
                    let hoursMatch = hoursRegex.exec(u.textContent);
                    let minsMatch = minsRegex.exec(u.textContent);
                    let currHours = parseInt(hoursMatch ? hoursMatch[1] : '0');
                    let currMins = parseInt(minsMatch ? minsMatch[1] : '0');
                    currTimer = currHours * 60 + currMins;

                    let newTimer;
                    if (currTimer < 59) {
                        newTimer = 60;
                    } else if (currTimer < 119) {
                        newTimer = 120;
                    } else if (currTimer < 179) {
                        newTimer = 180;
                    } else if (currTimer < 239) {
                        newTimer = 240;
                    } else if (currTimer < 299) {
                        newTimer = 300;
                    } else if (currTimer < 359) {
                        newTimer = 360;
                    } else if (currTimer < 419) {
                        newTimer = 420;
                    } else if (currTimer < 479) {
                        newTimer = 480;
                    } else if (currTimer = 480) {
                        newTimer = 0;
                    } else {
                        this.error(`Error setting timer. u.textContent = ${u.textContent}; currTimer = ${currTimer}`);
                        newTimer = 60;
                        this.error(`Defaulting to ${newTimer}`);
                    }

                    b.classList.add('loading');

                    this.log(`Set timer to: ${newTimer}`);
                    this.setTimer(hass, newTimer);
                }
            }
        }

        // Child lock event bindings
        ui.querySelector('.button-childlock').onclick = () => {
            this.log('Child lock')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let b = ui.querySelector('.button-childlock')
                if (!b.classList.contains('loading')) {
                    let u = ui.querySelector('.var-childlock')
                    const oldChildLockState = u.innerHTML;
                    const setChildLockOn = oldChildLockState === 'Off' ? true : false;
                    if (oldChildLockState !== 'Off' && oldChildLockState !== 'On') {
                        this.error(`Error setting child lock. oldChildLockState = ${oldChildLockState}`);
                        u.innerHTML = 'Off';
                    }
                    this.log(`Set child lock to: ${setChildLockOn ? 'On' : 'Off'}`);

                    this.setChildLock(hass, setChildLockOn);
                    b.classList.add('loading');
                }
            }
        }

        // Natural mode event bindings
        ui.querySelector('.var-natural').onclick = () => {
            this.log('Natural')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let u = ui.querySelector('.var-natural')
                let newMode = u.classList.contains('active') ? 'Normal' : 'Nature';
                this.setPresetMode(hass, newMode)
            }
        }

        // Sleep mode event bindings
        ui.querySelector('.var-sleep').onclick = () => {
            this.log('Sleep')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let u = ui.querySelector('.var-sleep')
                if (u.classList.contains('active') === false) {
                    this.log(`Set sleep mode to: On`)
                    hass.callService('fan', 'set_percentage', {
                        entity_id: entityId,
                        percentage: 1
                    });
                } else {
                    this.log(`Set sleep mode to: Off`)
                    hass.callService('fan', 'set_speed', {
                        entity_id: entityId,
                        speed: 'low'
                    });
                }
            }
        }
        // LED mode event bindings
        ui.querySelector('.var-led').onclick = () => {
            this.log('Led')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let u = ui.querySelector('.var-led')
                if (!this.supportedAttributes.ledBrightness)
                {
                    const setLedOn = !u.classList.contains('active');
                    this.log(`Set led mode to: ${setLedOn ? 'On' : 'Off'}`);
                    this.setLed(hass, setLedOn);
                }
                else
                {
                    let u = ui.querySelector('.var-led');
                    let v = ui.querySelector('.var-led-brightness');
                    var ledBrightness = 0;
                    if (!u.classList.contains('active'))
                    {
                        ledBrightness = 25;
                    } else {
                        var percent = parseInt(v.innerHTML.replace('%', ''));
                        if (percent < 25)
                            ledBrightness = 25;
                        else if (percent < 50)
                            ledBrightness = 50;
                        else if (percent < 75)
                            ledBrightness = 75;
                        else if (percent < 100)
                            ledBrightness = 100;
                        else 
                            ledBrightness = 0;
                    }
                    this.log(`Change LED value: ` + ledBrightness);
                    this.setLedBrightness(hass, ledBrightness);
                }
            }
        }

        // Buzzer mode event bindings
        ui.querySelector('.var-buzzer').onclick = () => {
            this.log('Buzzer')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let u = ui.querySelector('.var-buzzer')
                const setBuzzerOn = !u.classList.contains('active');
                this.log(`Set buzzer mode to: ${setBuzzerOn ? 'On' : 'Off'}`);
                this.setBuzzer(hass, setBuzzerOn);
            }
        }

        // Ionizer mode event bindings
        ui.querySelector('.var-ionizer').onclick = () => {
            this.log('Ionizer')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let u = ui.querySelector('.var-ionizer')
                const setIonizerOn = !u.classList.contains('active');
                this.log(`Set ionizer mode to: ${setIonizerOn ? 'On' : 'Off'}`);
                this.setIonizer(hass, setIonizerOn);
            }
        }

        // Oscillation toggle event bindings
        ui.querySelector('.var-oscillating').onclick = () => {
            this.log('Oscillate')
            if (ui.querySelector('.fanbox').classList.contains('active')) {
                let u = ui.querySelector('.var-oscillating')
                const setOscillationOn = u.classList.contains('active') ? false : true;
                this.setOscillation(hass, setOscillationOn);
            }
        }

        //Fan title works as on/off button when animation is disabled
        if (this.config.disable_animation) {
            ui.querySelector('.var-title').onclick = () => {
                this.log('Toggle')
                hass.callService('fan', 'toggle', {
                    entity_id: entityId
                });
            }
        } else {
            ui.querySelector('.var-title').onclick = () => {
                this.log('Dialog box')
                moreInfo(entityId);
            }
        }
        /*
        ui.querySelector('.var-title').onclick = () => {
            this.log('Dialog box')
            card.querySelector('.dialog').style.display = 'block'
        }*/
        this.card = card;
        this.innerHTML = '';
        this.appendChild(card);
    }

    updateUI(hass) {
        const entity = hass.states[this.config.entity];
        if (!entity) {
            return;
        }
        const attrs = entity.attributes;

        if (entity.state === 'unavailable') {
            this.card.querySelector('.var-title').textContent = this.config.name + ' (Disconnected)';
            return;
        }

        this.setUI(this.card.querySelector('.fan-xiaomi-panel'), {
            title: this.config.name || attrs['friendly_name'],
            speed_percentage: this.getSpeedPercentage(hass),
            state: entity.state,
            child_lock: this.getChildLock(hass),
            oscillating: this.getOscillation(hass),
            delay_off_countdown: this.getTimer(hass),
            angle: this.getAngle(hass),
            speed_level: this.getSpeedLevel(hass),
            preset_mode: this.getPresetMode(hass),
            model: this.getModel(hass),
            led: this.getLed(hass),
            temperature: this.getTemperature(hass),
            humidity: this.getHumidity(hass),
            power_supply: this.getPowerSupply(hass),
            buzzer: this.getBuzzer(hass),
            ionizer: this.getIonizer(hass),
            ledBrightness: this.getLedBrightness(hass)
        });
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('You must specify an entity');
        }
        this.config = config;

        // Force re-layout to update the preview
        if (this.mostRecentHass) {
            this.card = null;
            this.hass = this.mostRecentHass;
        }
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return 1;
    }

    /*********************************** UI settings ************************************/
    getUI() {
        let csss = '';
        for (var i = 1; i < 73; i++) {
            csss += '.ang' + i + ` {
                transform: rotate(`+ (i - 1) * 5 + `deg);
            }`
        }
        let fans = '';
        for (var i = 1; i < 73; i++) {
            fans += `<div class="fan ang` + i + `"></div>`
        }
        let fan1s = '';
        for (var i = 1; i < 73; i += 2) {
            fan1s += `<div class="fan1 ang` + i + `"></div>`
        }
        let fanbox = document.createElement('div')
        fanbox.className = 'fan-xiaomi-panel'
        fanbox.innerHTML = `
<style>
.fan-xiaomi{position:relative;overflow:hidden;width:100%;height:335px}
.offline{opacity:0.3}
.loading{opacity:0.6}
.icon{overflow:hidden;width:2em;height:2em;vertical-align:-.15em;fill:gray}
.fan-xiaomi-panel{position:absolute;top:0;width:100%;text-align:center}
p{margin:0;padding:0}
.title{margin-top:20px;height:35px;cursor:pointer}
.title p{margin:0;padding:0;font-weight:700;font-size:18px}
.title span{font-size:9pt}
.attr-row{display:flex}
.attr-row .attr{width:100%;padding-bottom:2px}
.attr-row .attr-title{font-size:9pt}
.attr-row .attr-value{font-size:14px}
.op-row{display:flex;padding:10px;border-top:3px solid #717376!important}
.op-row .op{width:100%}
.op-row .op button{outline:0;border:none;background:0 0;cursor:pointer}
.op-row .op .icon-waper{display:block;margin:0 auto 5px;width:30px;height:30px}
.icon-value{font-size:75%}
.op-row .op.active button{color:#01be9e!important;text-shadow:0 0 10px #01be9e}
`+ csss + `
.fanbox-container{position:relative;}
.var-sensors{position:absolute;left:10px;text-align:left;color:var(--secondary-text-color);}
.var-power-supply{position:absolute;right:10px;color:var(--secondary-text-color);}
.fanbox{position:relative;margin:10px auto;width:150px;height:150px;border-radius:50%;background:#80808061}
.fanbox.active.oscillation{animation:oscillate 8s infinite linear}
.blades div{position:absolute;margin:15% 0 0 15%;width:35%;height:35%;border-radius:100% 50% 0;background:#989898;transform-origin:100% 100%}
.blades{width:100%;height:100%}
.fanbox.active .blades.level1{transform-origin:50% 50%;animation:blades 9s infinite linear;transform-box:fill-box!important}
.fanbox.active .blades.level2{transform-origin:50% 50%;animation:blades 7s infinite linear;transform-box:fill-box!important}
.fanbox.active .blades.level3{transform-origin:50% 50%;animation:blades 5s infinite linear;transform-box:fill-box!important}
.fanbox.active .blades.level4{transform-origin:50% 50%;animation:blades 3s infinite linear;transform-box:fill-box!important}
.fan{top:0;transform-origin:0 250%}
.fan,.fan1{position:absolute;left:0;margin-left:50%;width:1%;height:20%;background:#fff}
.fan1{top:20%;transform-origin:0 150%}
.c1{top:20%;left:20%;width:60%;height:60%;border:2px solid #fff;border-radius:50%;cursor:pointer;baskground:#ffffff00}
.c1,.c2{position:absolute;box-sizing:border-box}
.c2{top:0;left:0;width:100%;height:100%;border:10px solid #f7f7f7;border-radius:50%}
.c3{position:absolute;top:40%;left:40%;box-sizing:border-box;width:20%;height:20%;border-radius:50%;background:#fff;color:#ddd;border:2px solid white;line-height:24px}
.c3.active{border:2px solid #8dd5c3}
.c3 span ha-icon{width:100%;height:100%}
.chevron{position:absolute;top:0;height:100%;opacity:0}
.show{opacity:1}
.hidden{opacity:0}
.chevron.left{left:-30px;cursor:pointer}
.chevron.right{right:-30px;cursor:pointer}
.chevron span ha-icon{width:30px;height:100%}
.chevron span ha-icon{width:30px;height:100%;display:flex;align-items:center;justify-content:center}
.button-angle,.button-childlock,.button-timer {cursor:pointer}

@keyframes blades{0%{transform:translate(0,0) rotate(0)}
to{transform:translate(0,0) rotate(3600deg)}
}
@keyframes oscillate{0%{transform:perspective(10em) rotateY(0)}
20%{transform:perspective(10em) rotateY(40deg)}
40%{transform:perspective(10em) rotateY(0)}
60%{transform:perspective(10em) rotateY(-40deg)}
80%{transform:perspective(10em) rotateY(0)}
to{transform:perspective(10em) rotateY(40deg)}
}


</style>
<div class="title">
<p class="var-title">Xiaomi Fan</p>
</div>
<div class="fanbox-container">
<div class="var-sensors"></div>
<div class="var-power-supply"></div>
<div class="fanbox">
<div class="blades">
<div class="b1 ang1"></div>
<div class="b2 ang25"></div>
<div class="b3 ang49"></div>
</div>
`+ fans + fan1s + `
<div class="c2"></div>
<div class="c3">
<span class="icon-waper">
<ha-icon icon="mdi:power"></ha-icon>
</span>
</div>
<div class="c1"></div>
<div class="chevron left hidden">
<span class="icon-waper">
<ha-icon icon="mdi:chevron-left"></ha-icon>
</div>
<div class="chevron right hidden">
<span class="icon-waper">
<ha-icon icon="mdi:chevron-right"></ha-icon>
</div>
</span>
</div>
</div>
</div>
<div class="attr-row upper-container">
<div class="attr button-childlock">
<p class="attr-title">Child Lock</p>
<p class="attr-value var-childlock">Off</p>
</div>
<div class="attr button-angle">
<p class="attr-title">Angle(&deg;)</p>
<p class="attr-value var-angle">120</p>
</div>
<div class="attr button-timer">
<p class="attr-title">Timer</p>
<p class="attr-value var-timer">Off</p>
</div>
</div>
<div class="op-row">
<div class="op var-speed">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:numeric-0-box-outline"></ha-icon>
</span>
Speed
</button>
</div>

<div class="op var-speedup">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:fan-chevron-up"></ha-icon>
</span>
Speed up
</button>
</div>
<div class="op var-speeddown">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:fan-chevron-down"></ha-icon>
</span>
Speed down
</button>
</div>

<div class="op var-oscillating">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:debug-step-over"></ha-icon>
</span>
Oscillate
</button>
</div>
<div class="op var-natural">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:leaf"></ha-icon>
</span>
Natural
</button>
</div>
<div class="op var-sleep">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:power-sleep"></ha-icon>
</span>
Sleep
</button>
</div>
<div class="op var-led">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:lightbulb-outline"></ha-icon>
<div class="icon-value var-led-brightness">100%</div>
</span>
LED
</button>
</div>
<div class="op var-buzzer">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:volume-high"></ha-icon>
</span>
Buzzer
</button>
</div>
<div class="op var-ionizer">
<button>
<span class="icon-waper">
<ha-icon icon="mdi:shimmer"></ha-icon>
</span>
Ionizer
</button>
</div>
</div>
`
        return fanbox
    }

    // Define UI Parameters

    setUI(fanboxa, { title, speed_percentage, state, child_lock, oscillating,
        delay_off_countdown, angle, speed_level, preset_mode, model, led,
        temperature, humidity, power_supply, buzzer, ionizer, ledBrightness
    }) {
        fanboxa.querySelector('.var-title').textContent = title

        var needSeparatorFlag = false
        // Child Lock
        if (this.supportedAttributes.childLock) {
            needSeparatorFlag = true
            if (child_lock) {
                fanboxa.querySelector('.var-childlock').textContent = 'On'
            } else {
                fanboxa.querySelector('.var-childlock').textContent = 'Off'
            }
            fanboxa.querySelector('.button-childlock').classList.remove('loading')
        } else {
            fanboxa.querySelector('.button-childlock').style.display = 'none'
        }

        // Angle
        if (this.supportedAttributes.angle) {
            if (needSeparatorFlag)
                fanboxa.querySelector('.button-angle').style.borderLeft = '1px solid #01be9e'
            needSeparatorFlag = true
            fanboxa.querySelector('.var-angle').textContent = angle
            fanboxa.querySelector('.button-angle').classList.remove('loading')
        } else {
            fanboxa.querySelector('.button-angle').style.display = 'none'
        }

        // Timer
        if (this.supportedAttributes.timer) {
            if (needSeparatorFlag)
                fanboxa.querySelector('.button-timer').style.borderLeft = '1px solid #01be9e'
            needSeparatorFlag = true

            let timer_display = 'Off'
            if (delay_off_countdown) {
                let total_mins = delay_off_countdown

                if (model === 'dmaker.fan.p15') {
                    total_mins = total_mins / 60
                }

                let hours = Math.floor(total_mins / 60)
                let mins = Math.floor(total_mins % 60)
                if (hours) {
                    if (mins) {
                        timer_display = `${hours}h ${mins}m`
                    } else {
                        timer_display = `${hours}h`
                    }
                } else {
                    timer_display = `${mins}m`
                }
            }
            fanboxa.querySelector('.var-timer').textContent = timer_display
            fanboxa.querySelector('.button-timer').classList.remove('loading')
        } else {
            fanboxa.querySelector('.button-timer').style.display = 'none'
        }
        if (!needSeparatorFlag)
            fanboxa.querySelector('.upper-container').style.display = 'none'

        // LED
        let activeElement = fanboxa.querySelector('.c3')
        if (this.supportedAttributes.led) {
            if (led) {
                if (activeElement.classList.contains('active') === false) {
                    activeElement.classList.add('active')
                }
            } else {
                activeElement.classList.remove('active')
            }
        }
        activeElement = fanboxa.querySelector('.var-led')
        if (this.supportedAttributes.led && !this.config.hide_led_button) {
            if (led) {
                if (activeElement.classList.contains('active') === false) {
                    activeElement.classList.add('active')
                }
            } else {
                activeElement.classList.remove('active')
            }
        } else {
            activeElement.style.display = 'none'
        }
        // LED Brighness
        if (activeElement.style.display != 'none')
        {
            activeElement = fanboxa.querySelector('.var-led-brightness')
            if (this.supportedAttributes.ledBrightness)
            {
                if (ledBrightness > 0)
                {
                    activeElement.innerHTML = ledBrightness + "%"
                    activeElement.style.display = 'block';
                }
                else
                    activeElement.style.display = 'none';
            } else {
                activeElement.style.display = 'none'
            }
        }

        // Buzzer
        activeElement = fanboxa.querySelector('.var-buzzer')
        if (this.supportedAttributes.buzzer) {
            if (buzzer) {
                if (activeElement.classList.contains('active') === false) {
                    activeElement.classList.add('active')
                }
            } else {
                activeElement.classList.remove('active')
            }
        } else {
            activeElement.style.display = 'none'
        }

        // Ionizer
        activeElement = fanboxa.querySelector('.var-ionizer')
        if (this.supportedAttributes.ionizer) {
            if (ionizer) {
                if (activeElement.classList.contains('active') === false) {
                    activeElement.classList.add('active')
                }
            } else {
                activeElement.classList.remove('active')
            }
        } else {
            activeElement.style.display = 'none'
        }

        // Power
        activeElement = fanboxa.querySelector('.fanbox')
        if (state === 'on') {
            if (activeElement.classList.contains('active') === false) {
                activeElement.classList.add('active')
            }
        } else {
            activeElement.classList.remove('active')
        }


        // Speed Level
        activeElement = fanboxa.querySelector('.var-speed')
        let iconSpan = activeElement.querySelector('.icon-waper')
        if (state === 'on') {
            if (activeElement.classList.contains('active') === false) {
                activeElement.classList.add('active')
            }
        } else {
            activeElement.classList.remove('active')
        }

        iconSpan.innerHTML = `<ha-icon icon="mdi:numeric-${speed_level}-box-outline"></ha-icon>`
        activeElement = fanboxa.querySelector('.fanbox .blades')
        activeElement.className = `blades level${speed_level}`

        // Natural mode
        activeElement = fanboxa.querySelector('.var-natural')
        if (this.supportedAttributes.naturalSpeed) {
            if (preset_mode === 'Nature') {
                if (activeElement.classList.contains('active') === false) {
                    activeElement.classList.add('active')
                }
            } else {
                activeElement.classList.remove('active')
            }
        } else {
            activeElement.style.display = 'none'
        }

        // Sleep mode
        activeElement = fanboxa.querySelector('.var-sleep')
        if (this.supportedAttributes.sleepMode) {
            if (speed_percentage_int == 1) {
                if (activeElement.classList.contains('active') === false) {
                    activeElement.classList.add('active')
                }
            } else {
                activeElement.classList.remove('active')
            }
        } else {
            activeElement.style.display = 'none'
        }

        // Oscillation
        activeElement = fanboxa.querySelector('.var-oscillating')
        let fb = fanboxa.querySelector('.fanbox')
        if (oscillating) {
            if (fb.classList.contains('oscillation') === false) {
                fb.classList.add('oscillation')
            }
            if (activeElement.classList.contains('active') === false) {
                activeElement.classList.add('active')
            }
        } else {
            activeElement.classList.remove('active')
            fb.classList.remove('oscillation')
        }

        //Left and Right
        if (!this.supportedAttributes.rotationAngle) {
            fanboxa.querySelector('.left').style.display = 'none'
            fanboxa.querySelector('.right').style.display = 'none'
        }

        if (!this.supportedAttributes.speedIncreaseDecreaseButtons) {
            activeElement = fanboxa.querySelector('.var-speedup')
            activeElement.style.display = 'none'
            activeElement = fanboxa.querySelector('.var-speeddown')
            activeElement.style.display = 'none'
        } else {
            activeElement = fanboxa.querySelector('.var-speed')
            activeElement.style.display = 'none'
            activeElement = fanboxa.querySelector('.var-oscillating')
            activeElement.style.display = 'none'
        }

        // Fan Animation
        if (this.config.disable_animation) {
            fanboxa.querySelector('.fanbox-container').style.display = 'none'
            this.card.style.height = '170px'
        } else {
            // Sensors
            let sensorContent = "";
            if (temperature !== undefined) {
                sensorContent += `${temperature} °C<br />`;
            }
            if (humidity !== undefined) {
                sensorContent += `${humidity} %<br />`;
            }
            if (sensorContent) {
                fanboxa.querySelector('.var-sensors').innerHTML = sensorContent;
            }

            // Power Supply Icon
            if (power_supply !== undefined) {
                fanboxa.querySelector('.var-power-supply').innerHTML = `<ha-icon icon="mdi:power-plug-${power_supply ? '' : 'off-'}outline"></ha-icon>`;
            }
        }
    }
    /*********************************** UI Settings ************************************/

    // Add to logs
    log() {
        // console.log(...arguments)
    }
    warn() {
        // console.log(...arguments)
    }
    error() {
        console.error(...arguments)
    }
}

customElements.define('fan-xiaomi', FanXiaomi);

class ContentCardEditor extends LitElement {

    setConfig(config) {
        this.config = {
            // Merge over default config so we can guarantee we always have a complete config
            ...defaultConfig,
            ...config,
        };
    }

    static get properties() {
        return {
            hass: {},
            config: {}
        };
    }
    render() {
        return html`
    <style>
        .row{padding-bottom:5px;}
    </style>
    <div class="card-config">
    <div class="row">
    <paper-input
          label="${this.hass.localize("ui.panel.lovelace.editor.card.generic.title")} (${this.hass.localize("ui.panel.lovelace.editor.card.config.optional")})"
          .value="${this.config.name}"
          .configValue="${"name"}"
          @value-changed="${this._valueChanged}"
      ></paper-input>
      </div>
      <div class="row">
      <paper-dropdown-menu
        label="Platform"
        .configValue=${'platform'}
        @value-changed=${this._valueChanged}
        class="dropdown"
        >
        <paper-listbox
          slot="dropdown-content"
          .selected=${(Object.values(OptionsPlatform).indexOf(this.config.platform))}
        >
          ${(Object.values(OptionsPlatform)).map(item => html` <paper-item>${item}</paper-item> `)}
        </paper-listbox>
      </paper-dropdown-menu>
      </div>
      <div class="row">
      <ha-entity-picker
        .label="${this.hass.localize(
            "ui.panel.lovelace.editor.card.generic.entity"
        )} (${this.hass.localize(
            "ui.panel.lovelace.editor.card.config.required"
        )})"
        .hass=${this.hass}
        .value=${this.config.entity}
        .configValue=${"entity"}
        .includeDomains=${includeDomains}
        @change=${this._valueChanged}
        allow-custom-entity
      ></ha-entity-picker>
      </div>
      <div class="row">
      <ha-formfield label="Disable animation">
        <ha-switch
          .checked=${this.config.disable_animation}
          .configValue="${'disable_animation'}"
          @change=${this._valueChanged}
        ></ha-switch>
      </ha-formfield>
      </div>
      <div class="row">
      <ha-formfield label="Show sleep mode button">
        <ha-switch
          .checked=${this.config.force_sleep_mode_support}
          .configValue="${'force_sleep_mode_support'}"
          @change=${this._valueChanged}
        ></ha-switch>
      </ha-formfield>
      </div>
      <div class="row">
      <ha-formfield label="Hide LED button (for supported devices)">
        <ha-switch
          .checked=${this.config.hide_led_button}
          .configValue="${'hide_led_button'}"
          @change=${this._valueChanged}
        ></ha-switch>
      </ha-formfield>
      </div>
    </div>
    `
    }
    _focusEntity(e) {
        e.target.value = ''
    }

    _valueChanged(e) {
        if (!this.config || !this.hass) {
            return;
        }
        const { target } = e;
        if (target.configValue) {
            if (target.value === '') {
                delete this.config[target.configValue];
            } else {
                this.config = {
                    ...this.config,
                    [target.configValue]: target.checked !== undefined ? target.checked : target.value,
                };
            }
        }
        this.configChanged(this.config)
    }

    configChanged(newConfig) {
        const event = new Event("config-changed", {
            bubbles: true,
            composed: true
        });
        event.detail = { config: newConfig };
        this.dispatchEvent(event);
    }
}

customElements.define("content-card-editor", ContentCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
    type: "fan-xiaomi",
    name: "Xiaomi Fan Lovelace Card",
    preview: true,
    description: "Xiaomi Smartmi Fan Lovelace card for HASS/Home Assistant."
});
