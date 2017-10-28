import Scene from '../core/scene.js'

// TODO: Remove global
let context;

class Renderer {
  constructor(canvas) {
    this.ratio = global.devicePixelRatio;
    context = canvas.getContext('webgl2', {antialias: false});
  }

  setRatio(ratio) {
    this.radio = ratio;
  }

  render(scene, camera) {
    const gl = glContext();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (true) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0); // Clear all
    }

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear canvas

    camera.update();
    scene.traverse(camera);

  }
}

export const glContext = () => {
  return context;
}

export default Renderer;