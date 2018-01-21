import { glContext } from '../renderer/renderer.js';
import Entity from './object.js';
import GenericMaterial from '../materials/genericmaterial.js';
import Shader from '../materials/shader.js'
// For storing normal matrix, which depends on camera and is specific per mesh and NOT per object
import { mat4 } from 'gl-matrix';

class Mesh extends Entity {
  constructor(geometry) {
    super();

    this._normalMatrix = mat4.create();
    this._geometry = geometry;
    this._indexCount = geometry.indices.length;
    this._buffers = this._initializeBuffers();
  }

  get normalMatrix() { return this._normalMatrix; }
  get shader() { return this._shader; }
  get indexCount() { return this._indexCount; }
  get material() { return this._material; }
  get buffers() { return this._buffers; }

  set normalMatrix(normalMatrix) { this._normalMatrix = normalMatrix; }

  attachShader(materialData, placeHolderImg) {
    this._shader = new Shader(materialData, this._buffers, placeHolderImg);
    // If we fetch material from file - don't bother setting up this buffer
    if (materialData.vertexMaterialIndices) { 
      const gl = glContext();
      const materialBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, materialBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(materialData.vertexMaterialIndices), gl.STATIC_DRAW);
      this._buffers.materialIds = materialBuffer;
    }  
  }

  _initializeBuffers() {
    const geometry = this._geometry;
    const gl = glContext();

    // Position buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);

    // Normal buffer
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);

    // Index buffer
    let indexBuffer;
    if (geometry.indices && geometry.indices.length) {
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);
    }

    // UV's buffer  
    let textureBuffer;
    if (geometry.uvs) {
      textureBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.uvs), gl.STATIC_DRAW);
    }

    return {
      positions: positionBuffer,
      indices: indexBuffer,
      normals: normalBuffer,
      uvs: textureBuffer
    }
  }

  draw() {
    const gl = glContext();
    // UV's
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.uvs);
      // Bind attributes
      gl.enableVertexAttribArray(
        this._shader.programInfo.attribLocations.uv);
      gl.vertexAttribPointer(
        this._shader.programInfo.attribLocations.uv,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // Normals
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.normals);
      // Bind attributes
      gl.enableVertexAttribArray(
        this._shader.programInfo.attribLocations.normal);
      gl.vertexAttribPointer(
        this._shader.programInfo.attribLocations.normal,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // Positions
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.positions);
      gl.enableVertexAttribArray(
        this._shader.programInfo.attribLocations.position);
      gl.vertexAttribPointer(
        this._shader.programInfo.attribLocations.position,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // Materials
    if (this._buffers.materialIds) {
      {

        gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.materialIds);
        gl.enableVertexAttribArray(
          this._shader.programInfo.attribLocations.materialId);
        gl.vertexAttribIPointer(
          this._shader.programInfo.attribLocations.materialId,
          1,
          gl.UNSIGNED_SHORT,
          false,
          0,
          0
        );
      }
    }
    if (this._buffers.indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffers.indices);
      gl.drawElements(gl.TRIANGLES, this._indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.positions);
      gl.drawArrays(gl.TRIANGLES, 0, this._geometry.positions.length / 3.0);
    }
  }
}

export default Mesh;