import Object from './object.js';
//import { vec3, mat3, mat4, quat } from 'gl-matrix';
import { glContext } from '../renderer/renderer.js';
//import Program from '../renderer/program.js';

class Mesh extends Object {
  constructor(geometry, material) {
    super();

    const gl = glContext();
    this._material = material;
    this._buffers = this._initBuffers(geometry);
    debugger;
  }

  get material() { return this._material; }
  //get modelMatrix() { return this.modelMatrix; }

  _initBuffers(geometry) {
    const gl = glContext();

    // Positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);

    // Normals
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);

    let indexBuffer;
    if (geometry.indices && geometry.indices.length) {
      // Indices
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);
      this.vertexCount = geometry.indices.length;
    }
    this.positionCount = geometry.positions.length / 3.0;

    return {
      positions: positionBuffer,
      indices: indexBuffer,
      normals: normalBuffer
    };
  }

  render(camera) {
    const gl = glContext();

    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.normals);
      // Bind attributes
      gl.enableVertexAttribArray(
          this._material.programInfo.attribLocations.normal);
      gl.vertexAttribPointer(
          this._material.programInfo.attribLocations.normal,
          3,
          gl.FLOAT,
          false,
          0,
          0
      );
    }

    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.positions);
      gl.enableVertexAttribArray(
          this._material.programInfo.attribLocations.position);
      gl.vertexAttribPointer(
          this._material.programInfo.attribLocations.position,
          3,
          gl.FLOAT,
          false,
          0,
          0
      );
    }

    //const viewMatrix = mat4.create();
    //const modelViewMatrix = mat4.create();
    //const invmodelViewMatrix = mat4.create();
    //const normalMatrix = mat4.create();//transpose(inverse(modelView));

    //mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);
    //mat4.multiply(modelViewMatrix, viewMatrix, this.modelMatrix);
    //mat4.invert(normalMatrix, modelViewMatrix);
    //mat4.transpose(normalMatrix, normalMatrix);

    //this._material.setUniform("modelViewMatrix", modelViewMatrix);
    //this._material.setUniform("projectionMatrix", camera.projectionMatrix);
    //this._material.setUniform("normalMatrix", normalMatrix);

    // this.perModel.bind();
    // this.perModel.update([
    //     ...modelViewMatrix,
    //     ...normalMatrix,
    //     ...projectionMatrix
    // ]);

    if (this._buffers.indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffers.indices);
      gl.drawElements(gl.TRIANGLES, this.vertexCount, gl.UNSIGNED_INT, 0);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.positions);
      gl.drawArrays(gl.TRIANGLES, 0, this.positionCount);
    }
  }
}

export default Mesh;