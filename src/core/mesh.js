import Object from './object.js';

class Mesh extends Object {
  constructor(geometry, material) {
    super();

    this._geometry = geometry;
    this._material = material;
    this._buffers = undefined;
    this.indexCount = geometry.indices.length;
  }

  get material() { return this._material; }
  get buffers() { return this._buffers; }
  get geometry() { return this._geometry; }

  set buffers(buffers) { this._buffers = buffers; }
  set material(material) { this._material = material; }
}

export default Mesh;