import Entity from './object.js';
import GenericMaterial from '../materials/genericmaterial.js';

class Mesh extends Entity {
  constructor(geometry, material) {
    super();

    this._geometry = geometry;
    this._buffers = undefined;
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

  get material() { return this._material; }
  get buffers() { return this._buffers; }
  get geometry() { return this._geometry; }

  set buffers(buffers) { this._buffers = buffers; }
  //set material(material) { this._material = material; }
}

export default Mesh;