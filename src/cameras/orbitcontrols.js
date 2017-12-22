import { vec3 } from 'gl-matrix';
import { glContext } from '../renderer/renderer.js';

const offset = -Math.PI * 0.5;

function clamp(num, min, max) {
  return num <= min ? min : num >= max ? max : num;
}

class OrbitControls {
  constructor(camera) {
    const gl = glContext();

    this.camera = camera;
    this.domElement = gl.canvas;

    this.radius = Math.max(camera.position[0], camera.position[2]);

    this.rx = Math.atan2(camera.position[1], this.radius);
    this.ry = Math.atan2(camera.position[2], camera.position[0]) + offset;

    this.ox = 0;
    this.oy = 0;

    this.width = global.innerWidth;
    this.height = global.innerHeight;

    this.rotationSpeed = 5 * global.devicePixelRatio;

    this.zoomMin = 0.1;
    this.zoomMax = Infinity;
    this.zoomSpeed = 100;

    this.isDown = false;
    this._listen();
  }

  _listen() {
    this.domElement.addEventListener('mousedown', this._onStart.bind(this), false);
    this.domElement.addEventListener('mousemove', this._onMove.bind(this), false);
    this.domElement.addEventListener('mouseup', this._onEnd.bind(this), false);
    this.domElement.addEventListener('touchstart', this._onStart.bind(this), false);
    this.domElement.addEventListener('touchmove', this._onMove.bind(this), false);
    this.domElement.addEventListener('touchend', this._onEnd.bind(this), false);
    global.addEventListener('mousewheel', this._onWheel.bind(this), false);
  }

  // _disable() {
  //   this.domElement.addEventListener('mousedown', this._onStart.bind(this), false);
  //   this.domElement.addEventListener('mousemove', this._onMove.bind(this), false);
  //   this.domElement.addEventListener('mouseup', this._onEnd.bind(this), false);
  //   this.domElement.addEventListener('touchstart', this._onStart.bind(this), false);
  //   this.domElement.addEventListener('touchmove', this._onMove.bind(this), false);
  //   this.domElement.addEventListener('touchend', this._onEnd.bind(this), false);
  //   global.addEventListener('mousewheel', this._onWheel.bind(this), false);
  // }

  _onStart(event) {
    event.preventDefault();

    this.oy = this.ry;
    this.ox = this.rx;

    this._startY = event.pageX / this.width;
    this._startX = event.pageY / this.height;

    this.isDown = true;
  }

  _onMove(event) {
    if (this.isDown) {
      const y = event.pageX / this.width;
      const x = event.pageY / this.height;
      this.rx = this.ox + -(this._startX - x) * this.rotationSpeed;
      this.ry = this.oy + (this._startY - y) * this.rotationSpeed;
      this.rx = clamp(this.rx, -Math.PI * 0.5, Math.PI * 0.5);
    }
  }

  _onEnd() {
    this.isDown = false;
  }

  _onWheel(event) {
    event.preventDefault();
    let delta = 0;

    if (event.wheelDelta) {
      delta = event.wheelDelta;
    } else if (event.detail) {
      delta = event.detail;
    }
    this._zoom(-delta);
  }

  _zoom(delta) {
    this.radius += (delta / 1000) * this.zoomSpeed;
    this.radius = clamp(this.radius, this.zoomMin, this.zoomMax);
  }

  update() {
    const y = this.radius * Math.sin(this.rx);
    const r = this.radius * Math.cos(this.rx);
    const x = Math.sin(this.ry) * r;
    const z = Math.cos(this.ry) * r;
    vec3.set(this.camera.position, x, y, z);
    this.camera.lookAt();
  }

}

export default OrbitControls;