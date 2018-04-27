import { mat4, vec4 } from 'gl-matrix';
import Gui from '../gui/gui.js';
import PointLight from '../lights/pointlight.js';
import DirectionalLight from '../lights/directionallight.js';
//const dat = require('dat.gui').default;

class Scene {
  constructor() {
    this.objects = [];
    this.pointLights = [];
    this.directionalLights = [];
    this._gui = new Gui();
  }

  get gui() { return this._gui; }

  add(object) {
    if (object instanceof PointLight) {
      const light = object;
      this.pointLights.push(light);

      const lightsGui = this._gui.lights;
      const lightsSubFolder = lightsGui.addFolder("Light " + this.pointLights.length);

      lightsSubFolder.add(light.position, 'x', -1000, 1000).name("Pos x");
      lightsSubFolder.add(light.position, 'y', -1000, 1000).name("Pos y");
      lightsSubFolder.add(light.position, 'z', -1000, 1000).name("Pos z");  
      return;
    }

    if (object instanceof DirectionalLight) {
      const light = object;
      this.directionalLights.push(light);
      // Maybe
      // const lightsGui = this._gui.lights;
      // const lightsSubFolder = lightsGui.addFolder("Directional Light " + this.directionalLights.length);

      // lightsSubFolder.add(light.direction, 'x', -1000, 1000).name("Dir x");
      // lightsSubFolder.add(light.direction, 'y', -1000, 1000).name("Dir y");
      // lightsSubFolder.add(light.direction, 'z', -1000, 1000).name("Dir z");
      return;
    }

    this.objects.push(object);
  }

  traverse(camera) {
    const gui = this._gui;
    camera.setFov(this._gui.fov);
    // Update model and normal matrix
    for (let i = 0; i < this.objects.length; ++i) {
      this.objects[i].update();

      const modelMatrix = this.objects[i].modelMatrix;
      const normalMatrix = mat4.create();
      const modelViewMatrix = mat4.create();

      // Depends on camera, this is update.... per model
      mat4.multiply(modelViewMatrix, camera.viewMatrix, modelMatrix);
      //mat4.copy(modelViewMatrix, modelMatrix);
      mat4.invert(normalMatrix, modelViewMatrix);
      // Store normal matrix
      mat4.transpose(this.objects[i].normalMatrix, normalMatrix);
    }

    for (let i = 0; i < this.pointLights.length; i++) {
      this.pointLights[i].update();
    }
  }
}

export default Scene;