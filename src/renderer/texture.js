import { glContext } from '../renderer/renderer.js';

class Texture {
	constructor() {
		const gl = glContext();
		this._textureId = gl.createTexture();
	}

	createTexture(image) {
		const gl = glContext();
		this._level = 0;
		this._internalFormat = gl.RGBA4;
		this._width = image.width;
		this._height = image.height;
		this._border = 0;
		this._format = gl.RGBA;
		this._dataType = gl.UNSIGNED_BYTE;
		this._data = image;
		this.bind();
		 		
		gl.texImage2D(gl.TEXTURE_2D, this._level, this._internalFormat,
		          this._width, this._height, this._border, this._format, this._dataType,
		          this._data);

		if (!this._width || !this._height) {
			console.err("Missing width or height");
		}
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);	
	}

	bind() {
		const gl = glContext();
		gl.bindTexture(gl.TEXTURE_2D, this._textureId);
	}
};

export default Texture;