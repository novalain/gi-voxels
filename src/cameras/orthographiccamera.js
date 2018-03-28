import Object from '../core/object.js';
import { vec3, mat3, mat4, quat } from 'gl-matrix';
import { glContext } from '../renderer/renderer.js';

class OrthographicCamera extends Object {
    constructor(left, right, bottom, top, near, far) {
        super();

        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.near = near;
        this.far = far; 

        this.target = vec3.fromValues(0.0, 0.0, 0.0);
        this.up = vec3.fromValues(0.0, 1.0, 0.0);

        this.position = vec3.fromValues(0.0, 0.0, 0.0);
        this.target = vec3.create();
        this.up = vec3.fromValues(0, 1, 0);
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.updateProjectionMatrix(left, right, bottom, top, near, far);

        this.lookAt(vec3.fromValues(-1.0, 0.0, 0.0));
    }

    setTarget(dir) {
        vec3.copy(this.target, dir);
    }

    lookAt(v) { 
        mat4.lookAt(this.viewMatrix, this.position, v, this.up);
    }

    updateProjectionMatrix(left, right, bottom, top, near, far) {
        mat4.ortho(
          this.projectionMatrix,
          left,
          right,
          bottom,
          top,
          near,
          far,
        );
    }
}

export default OrthographicCamera;
