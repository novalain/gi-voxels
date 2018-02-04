import Renderer from './renderer/renderer.js';
import Cube from './geometry/cube.js';
import Sphere from './geometry/sphere.js';
import Scene from './core/scene.js';
import Mesh from './core/mesh.js';
import PerspectiveCamera from './cameras/perspectivecamera.js';
import PhongMaterial from './materials/phongmaterial.js';
import LambertMaterial from './materials/lambertmaterial.js';
import OrbitControls from './cameras/orbitcontrols.js';
import FlyControls from './cameras/flycontrols.js';
import PointLight from './lights/pointlight.js';
import ObjectLoader from './utils/objectloader.js';
import MaterialLoader from './utils/materialloader.js';
import ResourceLoader from './utils/resourceloader.js';

// TODO MOVE
Object.defineProperty(Float32Array.prototype, "x", {
  get: function() {
      return this[0];
  },
  set: function(val) {
      this[0] = val;
  }
});

Object.defineProperty(Float32Array.prototype, "y", {
  get: function() {
      return this[1];
  },
  set: function(val) {
      this[1] = val;
  }
});

Object.defineProperty(Float32Array.prototype, "z", {
  get: function() {
      return this[2];
  },
  set: function(val) {
      this[2] = val;
  }
});

export {
  PhongMaterial,
  LambertMaterial,
  ObjectLoader,
  Renderer,
  Cube,
  Sphere,
  Mesh,
  Scene,
  MaterialLoader,
  PerspectiveCamera,
  BasicMaterial,
  OrbitControls,
  FlyControls,
  PointLight,
  ResourceLoader
};
