import Object from '../core/object.js';
import { vec3 } from 'gl-matrix';
import Sphere from '../geometry/sphere.js';
import Mesh from '../core/mesh.js'

class DirectionalLight extends Object {
  constructor(props) {
    super();

    this._color = props && props.color || [1.0, 1.0, 1.0, 1.0];
    this._intensity = props && props.intensity || 0.5;
    this._positionViewSpace = vec3.create();
  }

  get positionViewSpace() { return this._positionViewSpace; }
  get color() { return this._color; }
  get intensity() { return this._intensity; }

  set positionViewSpace(psv) { this._positionViewSpace = psv; }
  set color(value) { this._color = value; }
  set intensity(value) { this._intensity = value; }
}

export default DirectionalLight;