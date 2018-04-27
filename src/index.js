import Renderer from './renderer/renderer.js';
import Cube from './geometry/cube.js';
import Sphere from './geometry/sphere.js';
import Scene from './core/scene.js';
import Mesh from './core/mesh.js';
import PerspectiveCamera from './cameras/perspectivecamera.js';
import OrthographicCamera from './cameras/orthographiccamera.js';
import OrbitControls from './cameras/orbitcontrols.js';
import FlyControls from './cameras/flycontrols.js';
import PointLight from './lights/pointlight.js';
import DirectionalLight from './lights/directionallight.js';
import ObjectLoader from './utils/objectloader.js';
import ResourceLoader from './utils/resourceloader.js';

// TODO: helper function to access vector members. Move this somewhere
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
  ObjectLoader,
  Renderer,
  Cube,
  Sphere,
  Mesh,
  Scene,
  Material,
  PerspectiveCamera,
  OrthographicCamera,
  BasicMaterial,
  OrbitControls,
  FlyControls,
  PointLight,
  DirectionalLight,
  ResourceLoader
};
