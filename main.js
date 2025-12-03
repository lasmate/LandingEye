import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Circles
const geometry = new THREE.CircleGeometry(1, 64);
const outerMat = new THREE.MeshBasicMaterial({ color: 0x4c351d, side: THREE.DoubleSide });
const midMat = new THREE.MeshBasicMaterial({ color: 0xefc760, side: THREE.DoubleSide });
const innerMat = new THREE.MeshBasicMaterial({ color: 0xf9f9aa, side: THREE.DoubleSide });

const outerCircle = new THREE.Mesh(geometry, outerMat);
const midCircle = new THREE.Mesh(geometry, midMat);
const innerCircle = new THREE.Mesh(geometry, innerMat);

// Group for all objects
const eyeGroup = new THREE.Group();
scene.add(eyeGroup);

// Offset Z to prevent z-fighting
midCircle.position.z = 0.01;
innerCircle.position.z = 0.02;

eyeGroup.add(outerCircle);
eyeGroup.add(midCircle);
eyeGroup.add(innerCircle);

// Stars
const outerStarShape = new THREE.Shape();
const outerRadius = 1;
const innerRadius = 0.15;
const points = 4;
for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) outerStarShape.moveTo(x, y);
    else outerStarShape.lineTo(x, y);
}
outerStarShape.closePath();

const innerStarShape = new THREE.Shape();
const innerOuterRadius = 0.7;
const innerInnerRadius = 0.13;
for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? innerOuterRadius : innerInnerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) innerStarShape.moveTo(x, y);
    else innerStarShape.lineTo(x, y);
}
innerStarShape.closePath();


const outerStarGeometry = new THREE.ShapeGeometry(outerStarShape);
const outerStarMaterial = new THREE.MeshBasicMaterial({ color: 0x171411, side: THREE.DoubleSide });
const outerStar = new THREE.Mesh(outerStarGeometry, outerStarMaterial);
outerStar.position.z = 0.03; // On top of inner circle
outerStar.scale.set(0, 0, 1); // Start invisible

const innerStarGeometry = new THREE.ShapeGeometry(innerStarShape);
const innerStarMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const innerStar = new THREE.Mesh(innerStarGeometry, innerStarMaterial);
innerStar.position.z = 0.04; // On top of outer star
innerStar.scale.set(0, 0, 1); // Start invisible
eyeGroup.add(outerStar);
eyeGroup.add(innerStar);

// Vignette Eyelid
const vignetteShape = new THREE.Shape();
const w = 30; // Large width to cover screen
const h = 20; // Large height
vignetteShape.moveTo(-w/2, -h/2);
vignetteShape.lineTo(w/2, -h/2);
vignetteShape.lineTo(w/2, h/2);
vignetteShape.lineTo(-w/2, h/2);
vignetteShape.closePath();

const hole = new THREE.Path();
hole.absellipse(0, 0, 4.5, 2, 0, Math.PI * 2, false, 0);//desc: x, y, xRadius, yRadius, startAngle, endAngle, clockwise, rotation
vignetteShape.holes.push(hole);

const vignetteGeometry = new THREE.ShapeGeometry(vignetteShape);

const vignetteMaterial = new THREE.ShaderMaterial({
    uniforms: {
        color1: { value: new THREE.Color(0xa49080) },
        color2: { value: new THREE.Color(0xead3c6) }
    },
    vertexShader: `
        varying vec2 vPos;
        void main() {
            vPos = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vPos;
        void main() {
            // Normalize position based on shape dimensions (w=30, h=20)
            float nx = (vPos.x + 15.0) / 30.0;
            float ny = (vPos.y + 10.0) / 20.0;
            
            // 45 degree gradient
            float t = (nx + ny) * 0.5;
            
            gl_FragColor = vec4(mix(color1, color2, t), 1.0);
        }
    `,
    side: THREE.DoubleSide
});

const vignette = new THREE.Mesh(vignetteGeometry, vignetteMaterial);
vignette.position.z = 1;
scene.add(vignette);


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

// Mouse Interaction
const mouse = { x: 0, y: 0 };
window.addEventListener('mousemove', (event) => {
    // Normalize mouse position from -1 to 1
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Click Interaction
let clickStartTime = null;
const clickDuration = 200; // 200ms pulse
window.addEventListener('click', () => {
    clickStartTime = performance.now();
});

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
        outerStar.scale.set(currentScaleStar, currentScaleStar, 1);
        innerStar.scale.set(currentScaleStar, currentScaleStar, 1);
        
        // Rotate 60 degrees (3*Math.PI/4) + scroll rotation
        const currentRotation = ((3*Math.PI / 4) * starEase) + starScrollRotation;
        outerStar.rotation.z = currentRotation;
        innerStar.rotation.z = currentRotation;

        // Click Effect Calculation
        let clickEffect = 0;
        if (clickStartTime !== null) {
            const clickElapsed = time - clickStartTime;
            if (clickElapsed < clickDuration) {
                const t = clickElapsed / clickDuration;
                // Spike function: 1 at start, 0 at end. Cubic ease out.
                clickEffect = 1 - Math.pow(t, 3);
            } else {
                clickStartTime = null;
            }
        }

        // Update Outer Star (Click Effect)
        const baseOuterRadius = 1;
        const currentOuterRadius = baseOuterRadius * (1 + 0.8 * clickEffect); // Increase by 80%
        const outerInnerRadius = 0.15;

        const newOuterStarShape = new THREE.Shape();
        for (let i = 0; i < 8; i++) {
            const radius = i % 2 === 0 ? currentOuterRadius : outerInnerRadius;
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) newOuterStarShape.moveTo(x, y);
            else newOuterStarShape.lineTo(x, y);
        }
        newOuterStarShape.closePath();
        outerStar.geometry.dispose();
        outerStar.geometry = new THREE.ShapeGeometry(newOuterStarShape);

        // Pulse Inner Star Radius
        // Oscillate between 0.06 and 0.13
        // Midpoint 0.095, Amplitude 0.035
        const pulseSpeed = 0.005;
        const currentInnerRadius = 0.095 + 0.035 * Math.sin(time * pulseSpeed);
        
        const newInnerStarShape = new THREE.Shape();
        const baseInnerOuterRadius = 0.6; 
        const currentInnerOuterRadius = baseInnerOuterRadius * (1 - 0.8 * clickEffect); // Decrease by 80%
        
        for (let i = 0; i < 8; i++) { // 4 points * 2
            const radius = i % 2 === 0 ? currentInnerOuterRadius : currentInnerRadius;
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) newInnerStarShape.moveTo(x, y);
            else newInnerStarShape.lineTo(x, y);
        }
        newInnerStarShape.closePath();
        
        innerStar.geometry.dispose();
        innerStar.geometry = new THREE.ShapeGeometry(newInnerStarShape);

    } else {
        outerStar.rotation.z = starScrollRotation;
        innerStar.rotation.z = starScrollRotation;
    }

    // Mouse follow rotation (tilt)
    const maxTilt = 0.3; // Adjust for more/less tilt
    eyeGroup.rotation.y += (mouse.x * maxTilt - eyeGroup.rotation.y) * 0.05;
    eyeGroup.rotation.x += (-mouse.y * maxTilt - eyeGroup.rotation.x) * 0.05;

    // Mouse follow position (shift)
    const maxShift = 1.2; // Adjust for more/less shift
    eyeGroup.position.x += (mouse.x * maxShift - eyeGroup.position.x) * 0.05;
    eyeGroup.position.y += (mouse.y * maxShift - eyeGroup.position.y) * 0.05;



    renderer.render(scene, camera);
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();