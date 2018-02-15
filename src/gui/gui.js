const dat = require('dat.gui').default;

class Gui {
  constructor() {
    this._gui = new dat.GUI();
    this._lightsFolder = this._gui.addFolder("Lights");
    //this.test = {displayBump: true};
    this.displayBump = false;
    this.bumpIntensity = 0.5;

    this._bumpMap = this._gui.add(this, 'displayBump');
    this._bumpIntensity = this._gui.add(this, 'bumpIntensity', 0.0, 5.0);
  }

  get lights() { return this._lightsFolder; }
};

export default Gui;