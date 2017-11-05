class ResourceLoader {
  constructor() {}

  loadImages(imageList) {
    let imagePromises = [];
    Object.entries(imageList).forEach(([key, value]) => {
      const imagePromise = new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
          const res =  {
            [key] : {
             'width' : image.width,
             'height' : image.height,
             'data' : image,
            }
          }
          resolve(res);
        };
        image.src = value;
      });

      imagePromises.push(imagePromise);
    });
    return Promise.all(imagePromises);
  }
}

export default ResourceLoader;