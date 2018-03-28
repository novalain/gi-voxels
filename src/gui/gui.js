const dat = require('dat.gui').default;

class Gui {
  constructor() {
    this._gui = new dat.GUI();
    this._lightsFolder = this._gui.addFolder("Lights");
    //this.test = {displayBump: true};
    this.displayBump = false;
    this.displaySpecular = false;
    this.bumpIntensity = 1.0;
    this.diffuseLod = 0.0;
    this.fov = 35; 

    const gridScale = 2000;
    this.orthoLeft = -gridScale;
    this.orthoRight = gridScale;
    this.orthoBottom = -gridScale;
    this.orthoTop = gridScale;
    this.orthoNear = gridScale;
    this.orthoFar = -gridScale;
    this.showVoxels = false;

    this._specularMap = this._gui.add(this, 'displaySpecular');
    this._bumpMap = this._gui.add(this, 'displayBump');
    this._bumpIntensity = this._gui.add(this, 'bumpIntensity', 0.0, 2.0);
    this._lod = this._gui.add(this, 'diffuseLod', 0.0, 5.0);
    this._fov = this._gui.add(this, 'fov', 0, 100);
    this._showVoxels = this._gui.add(this, 'showVoxels');

    this._orthoLeft = this._gui.add(this, 'orthoLeft', -5000, 5000);
    this._orthoRight = this._gui.add(this, 'orthoRight', -5000, 5000);
    this._orthoBottom = this._gui.add(this, 'orthoBottom', -5000, 5000);
    this._orthoTop = this._gui.add(this, 'orthoTop', -5000, 5000);
    this._orthoNear = this._gui.add(this, 'orthoNear', -5000, 5000);
    this._orthoFar = this._gui.add(this, 'orthoFar', -5000, 5000);
  }

  get lights() { return this._lightsFolder; }
};

export default Gui;