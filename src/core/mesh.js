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
    for (let i = 0; i < geometry.indices.length; ++i) {
      this._indexCounts.push(geometry.indices[i].length);
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

    this._vaos = [];
    for (let i = 0; i < geometry.indices.length; ++i) {
      this._vaos.push(gl.createVertexArray());
      gl.bindVertexArray(this._vaos[i]);

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
      
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(geometry.indices[i]), gl.STATIC_DRAW);
    }  
  }

  draw(shaderId) {
    const gl = glContext();
    const programInfo = this._shaders[shaderId].programInfo;

    gl.bindVertexArray(this._vaos[shaderId]);
    gl.drawElements(gl.TRIANGLES, this._indexCounts[shaderId], gl.UNSIGNED_INT, 0); 
  }
}

export default Mesh;