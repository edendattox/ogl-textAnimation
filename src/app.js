import {
  Renderer,
  Texture,
  Camera,
  Transform,
  Program,
  Mesh,
  Orbit,
  Plane,
} from "ogl";
import t1 from "../img/1.png";
import t2 from "../img/2.png";
import * as dat from "dat.gui";
import gsap from "gsap";

// hexToRgb function convert colors from hex to rgb

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255, // we divide by 255 to have decimal values
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

var colors = require("nice-color-palettes");

let rand = Math.floor(Math.random() * 100);

let p = colors[rand];

let palette = p.map((c) => {
  return hexToRgb(c);
});

let settings = {
  transition: 0,
  uLineWidth: 0,
  uLineThick: 0.1,
  uCurve: 0.5,
  speed: 1,
  run: () => {
    gsap.to(settings, {
      duration: 0.5,
      uCurve: 20,
      uLineThick: 0.01,
      speed: 10,

      onComplete: () => {
        gsap.to(settings, {
          duration: 0.5,
          uCurve: 0.5,
          uLineThick: 0.1,
          speed: 1,

          onComplete: () => {},
        });
      },
    });
  },
};

let gui = new dat.GUI();
gui.add(settings, "transition", 0, 1, 0.01);
gui.add(settings, "uLineWidth", 0, 1, 0.01);
gui.add(settings, "uLineThick", 0, 1, 0.01);
gui.add(settings, "uCurve", 0, 30, 0.01);
gui.add(settings, "run");

const vertex = /* glsl */ `
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec3 offset;
    attribute vec3 random;
    attribute vec3 color;
    attribute vec2 textureCoord;
    attribute vec2 lineWidth;
    attribute vec2 uv;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    uniform sampler2D uStart;
    uniform sampler2D uEnd;
    uniform float uTransition;
    uniform float uLineWidth;
    uniform float uLineThick;
    uniform float uTime;
    uniform float uCurve;
    varying vec3 vNormal;
    varying vec3 vColor;
    varying float vAlpha;

    vec2 rotate(vec2 v, float a) {
      float s = sin(a);
      float c = cos(a);
      mat2 m = mat2(c, -s, s, c);
      return m * v;
    }

    void main() {
       
        vColor = color;
        
        vec3 pos = position;
        pos.z = random.z * 0.0111;

        float uStartAlpha = step(0.5, texture2D(uStart, textureCoord).r);
        float uEndAlpha = step(0.5, texture2D(uEnd, textureCoord).r);
        float show = max(uStartAlpha, uEndAlpha);

        vAlpha = show*mix(uStartAlpha, uEndAlpha, uTransition);

        //  length of particles

        float scale = mix(lineWidth.x, lineWidth.y, uLineWidth);
        pos.y *= scale;
        pos.x *= uLineThick;

        //  curve to
       

        float curve = uCurve*0.001*sin(uv.y * 2. + uTime);

        pos.x += curve;


        //  rotate particles

        pos.xy = rotate(pos.xy, (uTime*10. + random.z*1000.)/(random.y*50. + 50.));


        // ?
        vec2 origin = textureCoord.xy*vec2(1., 0.5);

        pos.xy += origin-vec2(0.5, 0.25) + (1. - vAlpha)*(random.xy - 0.5);

        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragment = /* glsl */ `
    precision highp float;
    precision highp int;
    varying vec3 vNormal;
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      
      if(vAlpha==0.) discard;
      gl_FragColor = vec4(vColor, vAlpha);
    }
`;

{
  const renderer = new Renderer({ dpr: 2 });
  const gl = renderer.gl;
  document.body.appendChild(gl.canvas);
  gl.clearColor(1, 1, 1, 1);

  const camera = new Camera(gl, { fov: 15 });
  camera.position.set(0, 0, 3);
  camera.lookAt([0, 0, 0]);
  const controls = new Orbit(camera);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
  }
  window.addEventListener("resize", resize, false);
  resize();

  const scene = new Transform();

  // Upload empty texture while source loading
  const texture = new Texture(gl);

  // update image value with source once loaded
  const img = new Image();
  img.src = t1;
  img.onload = () => (texture.image = img);

  const texture1 = new Texture(gl);

  const img1 = new Image();
  img1.src = t2;
  img1.onload = () => (texture1.image = img1);

  const num = 19000;

  let offset = new Float32Array(num * 3);
  let random = new Float32Array(num * 3);
  let colors = new Float32Array(num * 3);
  let textureCoord = new Float32Array(num * 2);
  let lineWidth = new Float32Array(num * 2);

  for (let i = 0; i < num; i++) {
    let x = (Math.random() * 2 - 1) * 0.5;
    let y = (Math.random() * 2 - 1) * 0.5;

    offset.set([x, y, 0], i * 3);

    textureCoord.set([x + 0.5, y + 0.5], i * 2);

    lineWidth.set([Math.random(), Math.random() * 6], i * 2);

    let color = palette[Math.floor(Math.random() * 5)];

    colors.set([color.r, color.g, color.b], i * 3);

    random.set([Math.random(), Math.random(), Math.random()], i * 3);
  }

  const planeGeometry = new Plane(gl, {
    width: 0.02,
    height: 0.02,
    widthSegments: 10,
    heightSegments: 10,
    attributes: {
      offset: { instanced: 1, size: 3, data: offset },
      random: { instanced: 1, size: 3, data: random },
      color: { instanced: 1, size: 3, data: colors },
      textureCoord: { instanced: 1, size: 2, data: textureCoord },
      lineWidth: { instanced: 1, size: 2, data: lineWidth },
    },
  });
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uStart: { value: texture },
      uEnd: { value: texture1 },
      uTransition: { value: 0 },
      uLineWidth: { value: 0 },
      uLineThick: { value: 0 },
      uCurve: { value: 0 },
      uTime: { value: 0 },
    },
    transparent: true,
    // Don't cull faces so that plane is double sided - default is gl.BACK
    cullFace: null,
  });

  const plane = new Mesh(gl, {
    geometry: planeGeometry,
    program,
  });
  plane.position.set(0, 0, 0);
  plane.setParent(scene);

  requestAnimationFrame(update);
  function update() {
    requestAnimationFrame(update);
    controls.update();

    program.uniforms.uTransition.value = settings.transition;
    program.uniforms.uLineWidth.value = settings.uLineWidth;
    program.uniforms.uLineThick.value = settings.uLineThick;
    program.uniforms.uCurve.value = settings.uCurve;
    program.uniforms.uTime.value += settings.speed * 0.01;
    renderer.render({ scene, camera });
  }
}
