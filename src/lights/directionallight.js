import Object from '../core/object.js';
import { vec4 } from 'gl-matrix';

class DirectionalLight extends Object {
  constructor(props = {}) {
    super();

    this.guiColor = (props && props.color) || 0xdedede;
    this._color = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
    this.intensity = props.intensity || 0.5;
  }

  get color() {
    return this._color;
  }

  // get intensity() {
  //   return this.intensity;
  // }

  set color(value) {
    this._color = value;
  }
}

export default DirectionalLight;