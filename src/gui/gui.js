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

    this.voxelConeStepSize = 0.6;
    this.indirectLightningMultiplier = 4.0;
    this.directLightningMultiplier = 2.0;
    this.specularLightningMultiplier = 1.0;
    this.occlusionMultiplier = 1.0;

    this._voxelFolder.add(this, 'indirectLightningMultiplier', 0.0, 10.0).name("Indirect light");
    this._voxelFolder.add(this, 'directLightningMultiplier', 0.0, 10.0).name("Direct light");
    this._voxelFolder.add(this, 'specularLightningMultiplier', 0.0, 10.0).name("Specular light");
    this._voxelFolder.add(this, 'occlusionMultiplier', 0.0, 5.0).name("Occlusion");
    this._voxelFolder.add(this, 'voxelConeStepSize', 0.1, 2.0).name("Voxel Step Size");

    this._specularMap = this._gui.add(this, 'displaySpecular').name("Display Specular MAp");
    this._bumpMap = this._gui.add(this, 'displayBump').name("Display Normal Map");
    this._bumpIntensity = this._gui.add(this, 'bumpIntensity', 0.0, 2.0).name("Bump Intensity");
    this._fov = this._gui.add(this, 'fov', 0, 100);
    this._showVoxels = this._voxelDebugFolder.add(this, 'showVoxels').name("Render Voxels");
    this._voxelMipmap = this._voxelDebugFolder.add(this, 'voxelMipmap', 0.0, 5.0).name("Voxel Mipmap");
    this._voxelDebugStepSize = this._voxelDebugFolder.add(this, 'voxelDebugStepSize', 1.0, 20.0).name("Voxel Debug Step Size");
    this._displayShadowMapTextureQuad = this._gui.add(this, 'displayShadowMapTextureQuad').name("Display Shadow Map");
  }

  get lights() { return this._lightsFolder; }
};

export default Gui;