const dat = require('dat.gui').default;

class Gui {
  constructor() {
    this._gui = new dat.GUI();
    this._lightsFolder = this._gui.addFolder("Lights");
  }

  get lights() { return this._lightsFolder; }
};

export default Gui;