import Object from '../core/object.js';
import { vec3, mat3, mat4, quat } from 'gl-matrix';
import { glContext } from '../renderer/renderer.js';

class PerspectiveCamera extends Object {
  constructor(fov, ratio, near, far) {
    console.assert(fov && ratio && near && far)

    super();
    this.fov = fov * (Math.PI / 180);
    this.ratio = ratio;
    this.near = near;
    this.far = far;

    this.target = vec3.create();
    this.up = vec3.fromValues(0.0, 1.0, 0.0);
    this.projectionMatrix = mat4.create();
    this.viewMatrix = mat4.create();

    // Hardcoded for screenshot
    this.position = vec3.fromValues(-852.113525390625, 777.55029296875, 102.569091796875);
    this.rotation = vec3.fromValues(0.30800002813339233, 0.9680004119873047, 0);
    this.updateProjectionMatrix();
  }

  setFov(fov) {
    if (fov !== this.fov) {
      this.fov = fov * (Math.PI / 180)
      this.updateProjectionMatrix();
    }
  }

  setTarget(dir) {
    vec3.copy(this.target, dir);
  }

  lookAt() {
    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
  }

  updateProjectionMatrix() {
    const gl = glContext();
    mat4.perspective(
      this.projectionMatrix,
      this.fov,
      this.ratio,
      this.near,
      this.far
    )
  }
}

export default PerspectiveCamera;