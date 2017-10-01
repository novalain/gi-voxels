import { vec3, mat3, mat4, quat } from 'gl-matrix';

class Object {
  constructor() {
    this.quaternionAxisAngle = vec3.create();
    this.position = vec3.create();
    this.rotation = vec3.create();
    this.scale = vec3.fromValues(1, 1, 1);
    this.quaternion = quat.create();
    this.modelMatrix = mat4.create();
  }

  update() {
    mat4.identity(this.modelMatrix);
    quat.identity(this.quaternion);

    quat.rotateX(this.quaternion, this.quaternion, this.rotation[0]);
    quat.rotateY(this.quaternion, this.quaternion, this.rotation[1]);
    quat.rotateZ(this.quaternion, this.quaternion, this.rotation[2]);

    const axisAngle = quat.getAxisAngle(this.quaternionAxisAngle, this.quaternion);
    mat4.translate(this.modelMatrix, this.modelMatrix, [0.0, 0.0, -5.0]);
    mat4.rotate(this.modelMatrix, this.modelMatrix, axisAngle, this.quaternionAxisAngle);
    mat4.scale(this.modelMatrix, this.modelMatrix, this.scale);
  }
}

export default Object;