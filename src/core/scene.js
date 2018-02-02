import { mat4, vec4 } from 'gl-matrix';
import Gui from '../gui/gui.js'
//const dat = require('dat.gui').default;

class Scene {
  constructor() {
    this.objects = [];
    this.lights = [];
    this._gui = new Gui();
    //this._gui = new dat.GUI();
  }

  add(object) {
    // TODO: Sort by material
    this.objects.push(object);
  }

  // TODO: One generic add
  addLight(light) {
    this.lights.push(light);

    const lightsGui = this._gui.lights;
    const lightsSubFolder = lightsGui.addFolder("Light " + this.lights.length);

    lightsSubFolder.add(light.position, 'x', -1000, 1000).name("Pos x");
    lightsSubFolder.add(light.position, 'y', -1000, 1000).name("Pos y");
    lightsSubFolder.add(light.position, 'z', -1000, 1000).name("Pos z");
  }

  traverse(camera) {
    // Update lights
    // for (let i = 0; i < this.lights.length; i++) {
    //   this.lights[i].update();
    // }

    // update projection matrix
    
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
      mat4.transpose(this.objects[i]._normalMatrix, normalMatrix);
      // Store normal matrix somewhere
      //= normalMatrix;
    }

    for (let i = 0; i < this.lights.length; i++) {
      this.lights[i].update();
      const pos = this.lights[i].position;
      // Position in World Space
      const lightPosVec4 = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);
      // Calculate light position in view space on CPU
      vec4.transformMat4(lightPosVec4, lightPosVec4, camera.viewMatrix);
      // TODO remove this shitty matrix lib, can't remember syntax for casting
      this.lights[i].positionViewSpace[0] = lightPosVec4[0];
      this.lights[i].positionViewSpace[1] = lightPosVec4[1];
      this.lights[i].positionViewSpace[2] = lightPosVec4[2];
    }
  }
}

export default Scene;