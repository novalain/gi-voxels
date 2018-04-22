import { glContext } from '../renderer/renderer.js';
import Entity from './object.js';
import Texture from '../renderer/texture.js';
// For storing normal matrix, which depends on camera and is specific per mesh and NOT per object
import { mat4 } from 'gl-matrix';

class Mesh extends Entity {
  constructor(geometry, indices) {
    super();

    this._normalMatrix = mat4.create();
    this._geometry = geometry;
    this._indices = indices;
    this._buffers = this._initializeBuffers();
  }

  get normalMatrix() { return this._normalMatrix; }
  get shaders() { return this._shaders; }
  get indexCount() { return this._indexCount; }
  get buffers() { return this._buffers; }

  set normalMatrix(normalMatrix) { this._normalMatrix = normalMatrix; }

  setMaterialData(materialData) {
    this.materialData = materialData;
    if (materialData.mapSpecular) {
      this._specularMap = new Texture();
      this._specularMap.createTexture(materialData.mapSpecular.texture);
    }

    if (materialData.mapDiffuse) {
      this._diffuseMap = new Texture();
      this._diffuseMap.createTexture(materialData.mapDiffuse.texture);
    }

    if (materialData.mapBump) {
      this._bumpMap = new Texture();
      this._bumpMap.createTexture(materialData.mapBump.texture);
    }

    if (materialData.mapDissolve) {
      this._dissolveMap = new Texture();
      this._dissolveMap.createTexture(materialData.mapDissolve.texture);
    }
  }

  uploadTextures(program) {
    const gl = glContext();
    let location;
  
    if (this._diffuseMap) {
      gl.activeTexture(gl.TEXTURE0 + 0);
      this._diffuseMap.bind();
      location = gl.getUniformLocation(program, 'textureMap');
      gl.uniform1i(location, 0); // Tex unit 0
    }

    if (this._bumpMap) {
      gl.activeTexture(gl.TEXTURE0 + 1);
      this._bumpMap.bind();
      location = gl.getUniformLocation(program, 'bumpMap');
      gl.uniform1i(location, 1); // Tex unit 1
    }

    if (this._specularMap) {
      gl.activeTexture(gl.TEXTURE0 + 2);
      this._specularMap.bind();
      location = gl.getUniformLocation(program, 'specularMap');
      gl.uniform1i(location, 2);
    }

    if (this._dissolveMap) {
      gl.activeTexture(gl.TEXTURE0 + 3);
      this._dissolveMap.bind();
      location = gl.getUniformLocation(program, 'dissolveMap');
      gl.uniform1i(location, 3);
    }
  }

  _initializeBuffers() {
    const geometry = this._geometry;
    const gl = glContext();
    this._vao = gl.createVertexArray();
    gl.bindVertexArray(this._vao);
    // Position buffer
    {
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.positions), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(
        0,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }
    
    // Normal buffer
    {
      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.normals), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(
        1,
        3,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    // UV's buffer  
    {
      const textureBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.uvs), gl.STATIC_DRAW);
      // Bind attributes
      gl.enableVertexAttribArray(
        2);
      gl.vertexAttribPointer(
        2,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
    }

    if (geometry.tangents) {
      // Tangents
      {
        // Tangent buffer
        const tangentBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.tangents), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(
          3);
        gl.vertexAttribPointer(
          3,
          3,
          gl.FLOAT,
          false,
          0,
          0
        );  
      }
    }

    if (geometry.bitangents) {
      // Bitangent buffer
      {
        const bitangentBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bitangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.bitangents), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(
          4);
        gl.vertexAttribPointer(
          4,
          3,
          gl.FLOAT,
          false,
          0,
          0
        );
      }
    }

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this._indices), gl.STATIC_DRAW);
  }

  draw() {
    const gl = glContext();
    gl.bindVertexArray(this._vao);
    gl.drawElements(gl.TRIANGLES, this._indices.length, gl.UNSIGNED_INT, 0); 
  }
}

export default Mesh;