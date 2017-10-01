class Scene {
  constructor() {
    this.objects = [];
  }

  add(object) {
    this.objects.push(object);
  }

  traverse(camera) {
    for (let i = 0; i < this.objects.length; ++i) {
      this.objects[i].update();
      this.objects[i].render(camera);
    }
  }
}

export default Scene;