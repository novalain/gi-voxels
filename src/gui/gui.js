import { timingSafeEqual } from 'crypto';

const dat = require('dat.gui').default;

class Gui {
  constructor() {
    this._gui = new dat.GUI();
    this._lightsFolder = this._gui.addFolder("Lights");
    //this.test = {displayBump: true};
    this.displayBump = false;
    this.displaySpecular = false;
    this.bumpIntensity = 1.0;
    this.fov = 90;
    this.displayShadowMapTextureQuad = false;

    // Voxel related
    this._voxelFolder = this._gui.addFolder("Voxel GI");
    this._voxelDebugFolder = this._voxelFolder.addFolder("Debug");

    // Debug
    this.showVoxels = false;
    this.voxelMipmap = 0.0;
    this.voxelDebugStepSize = 5.0;

    this.voxelConeStepSize = 1.0;
    this.indirectLightningMultiplier = 4.0;
    this.directLightningMultiplier = 2.0;

    this._voxelFolder.add(this, 'indirectLightningMultiplier', 0.0, 10.0);
    this._voxelFolder.add(this, 'directLightningMultiplier', 0.0, 10.0);

    this._specularMap = this._gui.add(this, 'displaySpecular');
    this._bumpMap = this._gui.add(this, 'displayBump');
    this._bumpIntensity = this._gui.add(this, 'bumpIntensity', 0.0, 2.0);
    this._fov = this._gui.add(this, 'fov', 0, 100);
    this._showVoxels = this._voxelDebugFolder.add(this, 'showVoxels');
    this._voxelMipmap = this._voxelDebugFolder.add(this, 'voxelMipmap', 0.0, 5.0);
    this._voxelDebugStepSize = this._voxelDebugFolder.add(this, 'voxelDebugStepSize', 1.0, 20.0);
    this._displayShadowMapTextureQuad = this._gui.add(this, 'displayShadowMapTextureQuad');
  }

  get lights() { return this._lightsFolder; }
};

export default Gui;