import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const param = {
    numCircles: 100,
    numPartPerCircle: 1000,
    particleLim: 100000
};

function main() {
   
  
    let renderer, scene, camera, cameraCtrl, startTime;
    let width, height;
    let vertices;
  

    const cursor = new THREE.Vector2(0.0, 0.0);
    const { randFloat: rnd, randFloatSpread: rndFS } = THREE.MathUtils;
  
    init();
    initBuffersAndShaders();
    drawScene();

    function init() {
      renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
      camera = new THREE.PerspectiveCamera();
  
      camera.position.z = 500;
      cameraCtrl = new OrbitControls(camera, renderer.domElement);

      updateSize();
      window.addEventListener('resize', updateSize, false);
      renderer.domElement.addEventListener('mousemove', e => {
        cursor.x = (e.clientX / width) * 2 - 1;
        cursor.y = -(e.clientY / height) * 2 + 1;
      });
  
      startTime = Date.now();
      
    }
  
    function initBuffersAndShaders() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0);
  
      const positions = new Float32Array(param.particleLim * 3);
      const colors = new Float32Array(param.particleLim * 3);
      const sizes = new Float32Array(param.particleLim);
      const rotations = new Float32Array(param.particleLim);
      const scale = new Float32Array(param.particleLim);
      const ci = new Float32Array(param.particleLim);
      const cj = new Float32Array(param.particleLim);
  

      for (let i = 0; i < param.numCircles; i++) {
        for (let j = 0; j < param.numPartPerCircle; j++) {
            let index = param.numPartPerCircle * i + j;
            positions[index * 3] = rndFS(10);
            positions[index * 3 + 1] = rndFS(10);
            positions[index * 3 + 2] = rndFS(param.numCircles-i);
            colors[index * 3] = rnd(0,1);
            colors[index * 3 + 1] = rnd(0,1) ;
            colors[index * 3 + 2] = rnd(0,1);
            sizes[index] = rnd(5, 20);
            scale[index] = rnd(0.0001, 0.005);
            rotations[index] = rnd(0, Math.PI);
            ci[index] = i+1;
            cj[index] = j+1;
        }
      }
  
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
      geometry.setAttribute('scale', new THREE.BufferAttribute(scale, 1));
      geometry.setAttribute('ci', new THREE.BufferAttribute(ci, 1));
      geometry.setAttribute('cj', new THREE.BufferAttribute(cj, 1));
  
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          starText: { value: new THREE.TextureLoader().load('https://klevron.github.io/codepen/misc/star.png') },
          radius: { value: 5 },
          angleIncrement: { value: 2 * Math.PI / param.numPartPerCircle },
        },
        vertexShader: `
        uniform float time;
        uniform float radius;
        uniform float angleIncrement;

        attribute vec3 color;
        attribute float size;
        attribute float rotation;
        attribute float scale;
        attribute float ci;
        attribute float cj;

        varying vec4 outColor;
        varying float outRotation;

        void main() {
            outColor = vec4(color, 1.0);
            outRotation = rotation;
  
            // calculate local position of vertex in local space (within a circle)
            // this galaxy is implemented in a series of overlapping circles
            float radius_x = ci * radius;
            float radius_y = radius_x * 0.4;
            float angle = cj * angleIncrement;
            float t = time * 0.00002;

            // add the local position in ellipse xy coord to world space as defined in position
            vec2 world_space = vec2(cos(angle + t) * radius_x, sin(angle + t) * radius_y) + position.xy;
    
            // change the angle to get the spiral effect - the bigger the number, the more loose the spiral
            angle = ci * 0.15 - t;
            float ca = cos(angle);
            float sa = sin(angle);
            world_space = world_space * mat2(ca, -sa, sa, ca);
    
            vec3 rotated_world_space = vec3(world_space, position.z);
    
            gl_Position = projectionMatrix * modelViewMatrix * vec4(rotated_world_space, 1.0);
    
            gl_PointSize = size;
        }
      `,
        fragmentShader: `
        uniform sampler2D starText;
        varying vec4 outColor;
        varying float outRotation;

        void main() {
            float ca = cos(outRotation);
            float sa = sin(outRotation);
            mat2 rot = mat2(ca, -sa, sa, ca);
            // apply rotation to the star texture from the web
            gl_FragColor = outColor * texture2D(starText, gl_PointCoord * rot);
        }
      `,
        blending: THREE.AdditiveBlending, // adds the brighter color
        depthTest: false, // gives the shape
        transparent: true, // gives shape
      });
  
      vertices = new THREE.Points(geometry, material);
      scene.add(vertices);
    }
  
    function drawScene() {
      requestAnimationFrame(drawScene);
  
      vertices.material.uniforms.time.value = Date.now() - startTime;
      // rotate the pnts abt the z axis ( galaxy spins)
      vertices.rotation.z += -cursor.x * 0.02;
  
      cameraCtrl.update();
      renderer.render(scene, camera);
    }
  
    // camera's viewing frustum changes - must adjust projectionMatrix accordingly
    function updateSize() {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }
  
  main();
  