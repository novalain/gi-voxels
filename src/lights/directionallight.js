import Object from '../core/object.js';
import { vec4 } from 'gl-matrix';
import Sphere from '../geometry/sphere.js';
import Mesh from '../core/mesh.js'

class DirectionalLight extends Object {
  constructor(props) {
    super();

    //this.guiColor = (props && props.color) || 0xdedede;
    //this._color = props && ...props.color || [1.0, 1.0, 1.0, 1.0];
//    this._color = [1.0, 1.0, 1.0, 1.0];

    this._color = props && props.color || [1.0, 1.0, 1.0, 1.0];
    this._intensity = props && props.intensity || 0.5;

    // if (props ) {
    //   this._color = vec4.fromValues(...color);
    // } else {
    //   this._color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
    // }

    // if (this.debug) {
    //   const sphereGeometry = new Sphere(2.0, 5.0);
    //   this._sphere = new Mesh(sphereGeometry);
    // }
  }
  get color() { return this._color; }
  get intensity() { return this._intensity; }

  set color(value) { this._color = value; }
  set intensity(value) { this._intensity = value; }

  // render(camera, material) {
  //   this._sphere.position = this.position;
  //   this._sphere.render(camera, material);
  // }
}

export default DirectionalLight;