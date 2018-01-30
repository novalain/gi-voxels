import { mat4, vec4 } from 'gl-matrix';

class Scene {
  constructor() {
    this.objects = [];
    this.lights = [];
  }

  add(object) {
    // TODO: Sort by material
    this.objects.push(object);
  }

  // TODO: One generic add
  addLight(light) {
    this.lights.push(light);
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
      //const lModelMatrix = this.lights[i].modelMatrix;
      //const lModelView = mat4.create();
      //mat4.multiply(lModelView, camera.viewMatrix, lModelMatrix);
      //const out = vec4.create();

      // Calculate light pos in model space
      //const lightModelMatrix = this.lights[i].modelMatrix;

      //debugger;
      //const lightModelViewMatrix = mat4.create();
      //mat4.multiply(lightModelViewMatrix, camera.viewMatrix, lightModelMatrix);

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