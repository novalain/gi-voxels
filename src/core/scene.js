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
    //this._gui.add(this.displayBumpMap, 'bump');
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

      const lightsGui = this._gui.lights;
      const lightsSubFolder = lightsGui.addFolder("Directional Light " + this.directionalLights.length);

      lightsSubFolder.add(light.direction, 'x', -1000, 1000).name("Dir x");
      lightsSubFolder.add(light.direction, 'y', -1000, 1000).name("Dir y");
      lightsSubFolder.add(light.direction, 'z', -1000, 1000).name("Dir z");
      return;
    }

    this.objects.push(object);
  }

  traverse(camera) {    
    const gui = this._gui;
    camera.updateProjectionMatrix(gui.orthoLeft, gui.orthoRight, gui.orthoBottom, gui.orthoTop, gui.orthoNear, gui.orthoFar);

     // console.log("campos", camera.position);
    // Update camera
    // TODO: Do this on change
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
      const pos = this.pointLights[i].position;
      // Position in World Space
      const lightPosVec4 = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);
      // Calculate light position in view space on CPU
      vec4.transformMat4(lightPosVec4, lightPosVec4, camera.viewMatrix);
      // TODO remove this shitty matrix lib, can't remember syntax for casting
      this.pointLights[i].positionViewSpace[0] = lightPosVec4[0];
      this.pointLights[i].positionViewSpace[1] = lightPosVec4[1];
      this.pointLights[i].positionViewSpace[2] = lightPosVec4[2];
    }

    // Directional
    for (let i = 0; i < this.directionalLights.length; i++) {
      this.directionalLights[i].update();
      const dir = this.directionalLights[i].direction;
      // Direction in World Space
      const lightDirVec4 = vec4.fromValues(dir[0], dir[1], dir[2], 0.0);
      // TODO: we don't need homogenous coords here
      // Calculate light direction in view space on CPU
      vec4.transformMat4(lightDirVec4, lightDirVec4, camera.viewMatrix);
      // TODO remove this shitty matrix lib, can't remember syntax for casting
      this.directionalLights[i].directionViewSpace[0] = lightDirVec4[0];
      this.directionalLights[i].directionViewSpace[1] = lightDirVec4[1];
      this.directionalLights[i].directionViewSpace[2] = lightDirVec4[2];
    }
  }
}

export default Scene;