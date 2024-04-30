// const ADDITIONAL_ALLOWED_KEYS = ['Shift', 'Ctrl'];

interface Keybinds {
    MOVE_FORWARD: string;
    MOVE_BACKWARD: string;
    MOVE_LEFT: string;
    MOVE_RIGHT: string;

    JUMP: string;
    CROUCH: string;

    TOGGLE_FLY: string;
    CHANGE_PERSPECTIVE: string;
}

interface Settings {
    keybinds: Keybinds;
}

const DEFAULT_SETTINGS: Settings = {
    keybinds: {
        MOVE_FORWARD: 'W',
        MOVE_BACKWARD: 'S',
        MOVE_LEFT: 'A',
        MOVE_RIGHT: 'D',

        JUMP: ' ',
        CROUCH: 'SHIFT',

        TOGGLE_FLY: 'F',
        CHANGE_PERSPECTIVE: 'G'
    }
}

export default class SettingsManager {
    settings: Settings = DEFAULT_SETTINGS;

    constructor() {
        // const localSettingsStr = localStorage.get('settings');

        // try {
        //     const localSettings: Settings = JSON.parse(localSettingsStr);
        //     const keybinds = Object.keys(DEFAULT_SETTINGS.keybinds);

        //     const settings: Settings = Object.assign({}, DEFAULT_SETTINGS);

        //     for (const key of keybinds) {
        //         const savedKey: String = localSettings.keybinds[key];

        //         if (savedKey && this.isValidKey(savedKey)) {
        //             settings.keybinds[key] = savedKey;
        //         }
        //     }

        // } catch (e) {

        // }
    }

    getKeybinds() {
        return this.settings.keybinds;
    }

    isValidKey(key: String) {
        if (key.length == 1) {
            const charCode = key.charCodeAt(0);
            return
        }
    }
}