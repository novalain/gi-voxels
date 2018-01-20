import { glContext } from '../renderer/renderer.js';
import Entity from './object.js';
import GenericMaterial from '../materials/genericmaterial.js';

class Mesh extends Entity {
  constructor(geometry, material) {
    super();

    this._geometry = geometry;
    this._buffers = this._initializeBuffers();
    this.indexCount = geometry.indices.length;

    if (material) {
      // Phong material e.g
      this._material = material;
    } else {
      // This is just data
      let materialData = [];
      this.initializeMaterialData(geometry, materialData);
      this._material = new GenericMaterial(materialData);
    } 
  }

  get material() { return this._material; }
  get buffers() { return this._buffers; }
  get geometry() { return this._geometry; }

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

    // Material buffer
    let materialBuffer;
    if (geometry.vertexMaterialIndices) {
      materialBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, materialBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(geometry.vertexMaterialIndices), gl.STATIC_DRAW);
    }

    return {
      positions: positionBuffer,
      indices: indexBuffer,
      normals: normalBuffer,
      uvs: textureBuffer,
      materialIds: materialBuffer
    }
  }

  // TODO Move to generic material
  initializeMaterialData(data, materials) {
    if (!data.materialIndices) { 
      console.warn("Model has no material indices and hasn't been assigned a material");
      return;
    };
    Object.entries(data.materialIndices).forEach( ([key, value]) => {
      const material = data.materialsByIndex[value];
      materials.push(material);
    });
    // for (let i = 0; i < data.materialNames.length; i++) {
    //   const materialName = data.materialNames[i];
    //   const materialIndex = data.materialIndices;
    // }
  }
  //set material(material) { this._material = material; }
}

export default Mesh;