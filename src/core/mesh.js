import Object from './object.js';
import { vec3, mat3, mat4, quat } from 'gl-matrix';
import { glContext } from '../renderer/renderer.js';
//import Program from '../renderer/program.js';

class Mesh extends Object {
  constructor(geometry, material) {
    super();

    const gl = glContext();
    this._material = material;
    this._buffers = this._initBuffers(geometry);
  }

  _initBuffers(geometry) {
    const gl = glContext();

    // Positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);

    // Indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Now send the element array to GL
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);

    return {
      position: positionBuffer,
      indices: indexBuffer,
    };
  }

  render(camera) {
    const gl = glContext();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.position);
    // Bind attributes
    gl.enableVertexAttribArray(
        this._material.programInfo.attribLocations.position);
    gl.vertexAttribPointer(
      this._material.programInfo.attribLocations.position,
      3,
      gl.FLOAT,
      false,
      0,
      0
    )

    // TODO: This is really expensive and dumb to do for every single object (if they share material)
    this._material.activate();
    this._material.setUniform("modelViewMatrix", this.modelMatrix);
    this._material.setUniform("projectionMatrix", camera.projectionMatrix);
    this._material.setInternalUniforms();
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

  }
}

export default Mesh;