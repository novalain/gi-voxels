class Scene {
  constructor() {
    this.objects = [];
  }

  add(object) {
    this.objects.push(object);
  }

  traverse(camera) {
    for (let i = 0; i < this.objects.length; ++i) {
      // TODO: Very inefficient with many objects
      // Make sure to update objects accordingly and send a single draw call to OpenGL if possible
      this.objects[i].update();
      this.objects[i].render(camera);
    }
  }
}

export default Scene;