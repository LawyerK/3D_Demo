interface Keybinds {
    MOVE_FORWARD: String;
    MOVE_BACKWARD: String;
    MOVE_LEFT: String;
    MOVE_RIGHT: String;

    JUMP: String;
    CROUCH: String;

    TOGGLE_FLY: String;
}

interface Settings {
    keybinds: Keybinds;

}

export default class SettingsManager {
    constructor() {

    }
}