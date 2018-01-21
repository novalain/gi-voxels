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
    for (let i = 0; i < this.lights.length; i++) {
      this.lights[i].update();
    }

    for (let i = 0; i < this.lights.length; i++) {
      const pos = this.lights[i].position;
      const lightPosVec4 = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);

      const lModelMatrix = this.lights[i].modelMatrix;
      const lModelView = mat4.create();
      mat4.multiply(lModelView, camera.viewMatrix, lModelMatrix);

      const out = vec4.create();
      vec4.transformMat4(out, lightPosVec4, camera.viewMatrix);
      // TODO remove this shitty matrix lib, can't remember syntax for casting
      this.lights[i].positionViewSpace[0] = out[0];
      this.lights[i].positionViewSpace[1] = out[1];
      this.lights[i].positionViewSpace[2] = out[2];
    }

    for (let i = 0; i < this.objects.length; ++i) {
      this.objects[i].update();

      const modelMatrix = this.objects[i].modelMatrix;
      const normalMatrix = mat4.create();
      const modelViewMatrix = mat4.create();

      // Depends on camera, this is update.... per model
      mat4.multiply(modelViewMatrix, camera.viewMatrix, modelMatrix);
      mat4.invert(normalMatrix, modelViewMatrix);
      mat4.transpose(normalMatrix, normalMatrix);
      // Store normal matrix somewhere
      this.objects[i].normalMatrix = normalMatrix;      
    }
  }
}

export default Scene;