class Scene {
  constructor() {
    this.objects = [];
    this.lights = [];
  }

  add(object) {
    // TODO: Sort by material
    this.objects.push(object);
  }

  // TODO: One generic add
  addLight(light) {
    console.log(light);
    this.lights.push(light);
  }

  traverse(camera) {
    for (let i = 0; i < this.lights.length; ++i) {
      this.lights[i].update();
    }

    for (let i = 0; i < this.objects.length; ++i) {
      this.objects[i].update();
    }
    camera.update();
  }
}

export default Scene;