import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Circle
const geometry = new THREE.CircleGeometry(1, 64);
const outerMat = new THREE.MeshBasicMaterial({ color: 0x4c351d, side: THREE.DoubleSide });
const midMat = new THREE.MeshBasicMaterial({ color: 0xefc760, side: THREE.DoubleSide });
const innerMat = new THREE.MeshBasicMaterial({ color: 0xf9f9aa, side: THREE.DoubleSide });

const outerCircle = new THREE.Mesh(geometry, outerMat);
const midCircle = new THREE.Mesh(geometry, midMat);
const innerCircle = new THREE.Mesh(geometry, innerMat);

// Offset Z to prevent z-fighting
midCircle.position.z = 0.01;
innerCircle.position.z = 0.02;

scene.add(outerCircle);
scene.add(midCircle);
scene.add(innerCircle);

// Star
const starShape = new THREE.Shape();
const outerRadius = 1;
const innerRadius = 0.15;
const points = 4;

for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
}
starShape.closePath();

const starGeometry = new THREE.ShapeGeometry(starShape);
const starMaterial = new THREE.MeshBasicMaterial({ color: 0x171411, side: THREE.DoubleSide }); // 
const star = new THREE.Mesh(starGeometry, starMaterial);
star.position.z = 0.03; // On top of inner circle
star.scale.set(0, 0, 1); // Start invisible
scene.add(star);

// Calculate visible height at the circle's depth (z=0)
const distance = camera.position.z;
const vFov = THREE.MathUtils.degToRad(camera.fov);
const visibleHeight = 2 * Math.tan(vFov / 2) * distance;


// Set scales
// Geometry radius is 1, so diameter is 2. Scale factor = targetSize / 2
const startScale = (visibleHeight * 1.2) / 2;
const endScaleOuter = (visibleHeight * 0.7) / 2;
const endScaleMid = (visibleHeight * 0.45) / 2;
const endScaleInner = (visibleHeight * 0.20) / 2;
const endScaleStar = (visibleHeight * 0.30) / 2; 

outerCircle.scale.set(startScale, startScale, 1);
midCircle.scale.set(startScale, startScale, 1);
innerCircle.scale.set(startScale, startScale, 1);

// Scroll Interaction
let starScrollRotation = 0;
window.addEventListener('wheel', (event) => {
    const rotation = event.deltaY * 0.002;
    outerCircle.rotation.z += rotation;
    midCircle.rotation.z += rotation;
    innerCircle.rotation.z += rotation;
    starScrollRotation += rotation;
});

// Animation Loop
let startTime = null;
const circleDuration = 1500; // 1.5 seconds
const starDuration = 500; // 0.5 second for star animation

function animate(time) {
    requestAnimationFrame(animate);

    if (time === undefined) time = performance.now();

    if (startTime === null) startTime = time;
    const elapsed = time - startTime;
    
    // Circle Animation (Phase 1)
    const circleProgress = Math.min(elapsed / circleDuration, 1);
    const circleEase = 1 - Math.pow(1 - circleProgress, 3);

    const currentScaleOuter = startScale + (endScaleOuter - startScale) * circleEase;
    const currentScaleMid = startScale + (endScaleMid - startScale) * circleEase;
    const currentScaleInner = startScale + (endScaleInner - startScale) * circleEase;

    outerCircle.scale.set(currentScaleOuter, currentScaleOuter, 1);
    midCircle.scale.set(currentScaleMid, currentScaleMid, 1);
    innerCircle.scale.set(currentScaleInner, currentScaleInner, 1);

    // Star Animation (Phase 2 - starts after circleDuration)
    if (elapsed > circleDuration) {
        const starElapsed = elapsed - circleDuration;
        const starProgress = Math.min(starElapsed / starDuration, 1);
        const starEase = 1 - Math.pow(1 - starProgress, 3);

        const currentScaleStar = 0 + (endScaleStar - 0) * starEase;
        star.scale.set(currentScaleStar, currentScaleStar, 1);
        
        // Rotate 60 degrees (PI/3) + scroll rotation
        star.rotation.z = ((3*Math.PI / 4) * starEase) + starScrollRotation;
    } else {
        star.rotation.z = starScrollRotation;
    }

    renderer.render(scene, camera);
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();