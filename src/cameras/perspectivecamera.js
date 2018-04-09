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

    // this.position[0] = 0;
    // this.position[1] = 0;
    // this.position[2] = 10;

    this.position = vec3.fromValues(-852.113525390625, 777.55029296875, 102.569091796875);

    this.rotation = vec3.fromValues(0.30800002813339233, 0.9680004119873047, 0);
    // this.viewMatrix = mat4.fromValues(
    //   -0.4961880147457123, -0.2813391089439392, 0.8213682174682617, 0, -1.289958917460865e-9, 0.9460422992706299, 0.3240430951118469, 0, -0.8682150840759277, 0.16078628599643707, -0.4694148600101471, 0, 231.36911010742188, -316.7890930175781, -911.5103149414062, 1
    // );  

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