import { glContext } from '../renderer/renderer.js';
import Entity from './object.js';
import GenericMaterial from '../materials/genericmaterial.js';
import Shader from '../materials/shader.js'
import SimpleShader from '../materials/simpleshader.js'
// For storing normal matrix, which depends on camera and is specific per mesh and NOT per object
import { mat4 } from 'gl-matrix';

class Mesh extends Entity {
  constructor(geometry) {
    super();

    this._normalMatrix = mat4.create();
    this._geometry = geometry;
    this._indexCounts = [];

    this._shaders = [];
    //this._indexCount = geometry.indices.length;
    for (let i = 0; i < geometry.indicesByMaterial.length; ++i) {
      this._indexCounts.push(geometry.indicesByMaterial[i].length);
    }
    this._buffers = this._initializeBuffers();
  }

  get normalMatrix() { return this._normalMatrix; }
  get shaders() { return this._shaders; }
  get indexCount() { return this._indexCount; }
  get buffers() { return this._buffers; }

  set normalMatrix(normalMatrix) { this._normalMatrix = normalMatrix; }

  attachShader(materialData) {
    // If we fetch material from file - don't bother setting up this buffer
    Object.entries(materialData.materialIndices).forEach(([key, value]) => {
      const material = materialData.materialsByIndex[value];
      this._shaders.push(new SimpleShader(material));
    });
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

    // Tangent buffer
    const tangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.tangents), gl.STATIC_DRAW);

    // Bitangent buffer
    const bitangentBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bitangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.bitangents), gl.STATIC_DRAW);

    // Index buffer's
    let indicesBuffers = [];
    for (let i = 0; i < geometry.indicesByMaterial.length; ++i) {
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.indicesByMaterial[i]), gl.STATIC_DRAW);
      indicesBuffers.push(indexBuffer);
    }

    // let indexBuffer;
    // if (geometry.indices && geometry.indices.length) {
    //   indexBuffer = gl.createBuffer();
    //   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    //   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.indices), gl.STATIC_DRAW);
    // }

    // UV's buffer  
    let textureBuffer;
    if (geometry.uvs) {
      textureBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.uvs), gl.STATIC_DRAW);
    }

    return {
      positions: positionBuffer,
      indices: indicesBuffers,
      normals: normalBuffer,
      uvs: textureBuffer,
      tangents: tangentBuffer,
      bitangents: bitangentBuffer
    }
  }

  draw(shaderId) {
    const gl = glContext();
    const programInfo = this._shaders[shaderId].programInfo;

    // UV's
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.uvs);
      // Bind attributes
      gl.enableVertexAttribArray(
        programInfo.attribLocations.uv);
      gl.vertexAttribPointer(
        programInfo.attribLocations.uv,
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
        programInfo.attribLocations.normal);
      gl.vertexAttribPointer(
        programInfo.attribLocations.normal,
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
        programInfo.attribLocations.position);
      gl.vertexAttribPointer(
        programInfo.attribLocations.position,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // Tangents
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.tangents);
      gl.enableVertexAttribArray(
        programInfo.attribLocations.tangent);
      gl.vertexAttribPointer(
        programInfo.attribLocations.tangent,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // Bitangents
    {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.bitangents);
      gl.enableVertexAttribArray(
        programInfo.attribLocations.bitangent);
      gl.vertexAttribPointer(
        programInfo.attribLocations.bitangent,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }
    
    if (true) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._buffers.indices[shaderId]);
      gl.drawElements(gl.TRIANGLES, this._indexCounts[shaderId], gl.UNSIGNED_INT, 0);
    } else {
      gl.bindBuffer(gl.ARRAY_BUFFER, this._buffers.positions);
      gl.drawArrays(gl.TRIANGLES, 0, this._geometry.positions.length / 3.0);
    }
  }
}

export default Mesh;