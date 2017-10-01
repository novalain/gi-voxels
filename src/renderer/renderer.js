
import { mat4 } from 'gl-matrix';
import { createAndCompileProgram } from './renderer_utils.js'
import Cube from '../geometry/cube.js'
import Scene from '../core/scene.js'

let glc;

class Renderer {
  constructor(props = {}) {
    this.ratio = global.devicePixelRatio;
    this.context = this._createCanvas().getContext('webgl2', {antialias: false});

    glc = this.context;
    const gl = this.context;
   // const cube = new Cube(0.5, 0.5, 0.5);
  }

  setRatio(ratio) {
    this.radio = ratio;
  }

  _createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.boxSizing = 'border-box';
    canvas.width = global.innerWidth * global.devicePixelRatio;
    canvas.height = global.innerHeight * global.devicePixelRatio;
    canvas.style.width = window.innerWidth;
    canvas.style.height = window.innerHeight;
    document.body.appendChild(canvas);

    console.log(global.devicePixelRatio);
    console.log(global.innerWidth);

    return canvas;
  }

  render(scene, camera) {
    this.now += 0.05;  // convert to seconds
    const deltaTime = this.now - this.then;
    this.then = this.now;

    const clear = true;

    const gl = this.context;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (clear) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Should go into SCENE
    scene.traverse();
  }
}


export const glContext = () => {
  return glc;
}

export default Renderer;