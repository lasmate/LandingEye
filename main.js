import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import LanguageManager from './translator.js';

// Initialize language manager
const languageManager = new LanguageManager();

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Circles
const geometry = new THREE.CircleGeometry(1, 64);
const outerMat = new THREE.MeshBasicMaterial({ color: 0x4c351d, side: THREE.DoubleSide });
const midMat = new THREE.MeshBasicMaterial({ color: 0xefc760, side: THREE.DoubleSide });
const innerMat = new THREE.MeshBasicMaterial({ color: 0xf9f9aa, side: THREE.DoubleSide });
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });

const outerCircle = new THREE.Mesh(geometry, outerMat);
const midCircle = new THREE.Mesh(geometry, midMat);
const innerCircle = new THREE.Mesh(geometry, innerMat);
const outlineCircle = new THREE.Mesh(geometry, outlineMat);

// Group for all objects
const eyeGroup = new THREE.Group();
scene.add(eyeGroup);

// Offset Z to prevent z-fighting
outlineCircle.position.z = -0.01; // Behind
midCircle.position.z = 0.01;
innerCircle.position.z = 0.02;

eyeGroup.add(outlineCircle);
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
hole.absellipse(0, 0, 4.5, 2, 0, Math.PI * 2, true, 0);//desc: x, y, xRadius, yRadius, startAngle, endAngle, clockwise, rotation
vignetteShape.holes.push(hole);

const vignetteGeometry = new THREE.ShapeGeometry(vignetteShape, 64);

const vignetteMaterial = new THREE.ShaderMaterial({
    uniforms: {
        color1: { value: new THREE.Color(0xffdfc6) },
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
            
            // Vertical gradient
            float t = ny;
            
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

let isHoveringButton = false;
let continuousRotation = 0;


// Animation Loop
let startTime = null;
const circleDuration = 500; // 1.5 seconds
const starDuration = 250; // 0.5 second for star animation

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
    const currentScaleOutline = currentScaleOuter * 1.02; // 2% wider

    outerCircle.scale.set(currentScaleOuter, currentScaleOuter, 1);
    midCircle.scale.set(currentScaleMid, currentScaleMid, 1);
    innerCircle.scale.set(currentScaleInner, currentScaleInner, 1);
    outlineCircle.scale.set(currentScaleOutline, currentScaleOutline, 1);

    // Star Animation (Phase 2 - starts after circleDuration)
    if (elapsed > circleDuration) {
        const starElapsed = elapsed - circleDuration;
        const starProgress = Math.min(starElapsed / starDuration, 1);
        const starEase = 1 - Math.pow(1 - starProgress, 3);

        const currentScaleStar = 0 + (endScaleStar - 0) * starEase;
        outerStar.scale.set(currentScaleStar, currentScaleStar, 1);
        innerStar.scale.set(currentScaleStar, currentScaleStar, 1);
        
        // Infinite rotation on hover
        if (isHoveringButton) {
            continuousRotation += 0.05; // Adjust speed here
        }

        // Rotate 60 degrees (3*Math.PI/4) + continuous rotation
        const currentRotation = ((3*Math.PI / 4) * starEase) + continuousRotation;
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

// Helper to darken RGB color
function darkenRgb(rgb, percent) {
    const values = rgb.match(/\d+/g);
    if (!values || values.length < 3) return rgb;
    const factor = 1 - percent / 100;
    const r = Math.floor(values[0] * factor);
    const g = Math.floor(values[1] * factor);
    const b = Math.floor(values[2] * factor);
    return `rgb(${r}, ${g}, ${b})`;
}

// Prepare H1 animations
document.querySelectorAll('.page-content h1').forEach(h1 => {
    const text = h1.textContent;
    h1.textContent = '';
    text.split('').forEach((char) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.className = 'char';
        
        // Random duration between 2s and 4s for the breathing effect
        const duration = 2 + Math.random() * 2;
        span.style.animationDuration = `${duration}s`;
        
        // Random negative delay to ensure they start at different points in the cycle
        const delay = -Math.random() * duration;
        span.style.animationDelay = `${delay}s`;
        
        h1.appendChild(span);
    });
});

// Reusable Open Section Function
function openSection(x, y, targetId, colorElement) {
    // Calculate radius to cover screen
    const w = Math.max(x, window.innerWidth - x);
    const h = Math.max(y, window.innerHeight - y);
    const radius = Math.sqrt(w * w + h * h);

    // Colors
    let mainColor = 'rgb(33, 150, 243)'; // Default blue
    if (colorElement) {
        const computedStyle = window.getComputedStyle(colorElement);
        mainColor = computedStyle.backgroundColor;
        // If background is transparent (e.g. menu items), use a default
        if (mainColor === 'rgba(0, 0, 0, 0)' || mainColor === 'transparent') {
             mainColor = 'rgb(33, 33, 33)';
        }
    }
    
    const darkColor = darkenRgb(mainColor, 20);

    // Create Dark Circle (Background)
    const darkCircle = document.createElement('div');
    darkCircle.classList.add('transition-circle');
    darkCircle.style.backgroundColor = darkColor;
    darkCircle.style.zIndex = '199'; // Behind main circle
    darkCircle.style.width = `${radius * 2}px`;
    darkCircle.style.height = `${radius * 2}px`;
    darkCircle.style.left = `${x - radius}px`;
    darkCircle.style.top = `${y - radius}px`;
    document.body.appendChild(darkCircle);

    // Create Main Circle (Foreground)
    const circle = document.createElement('div');
    circle.classList.add('transition-circle');
    circle.style.backgroundColor = mainColor;
    circle.style.width = `${radius * 2}px`;
    circle.style.height = `${radius * 2}px`;
    circle.style.left = `${x - radius}px`;
    circle.style.top = `${y - radius}px`;
    document.body.appendChild(circle);
    
    // Force reflow
    darkCircle.getBoundingClientRect();
    circle.getBoundingClientRect();
    
    // Animate with delay for layering effect
    darkCircle.style.transform = 'scale(1)';
    setTimeout(() => {
        circle.style.transform = 'scale(1)';
    }, 100);

    // Show Content
    const content = document.getElementById(targetId);
    if (content) {
        content.classList.add('active');
        // Fade in after circle covers screen (approx 500ms + delay)
        setTimeout(() => {
            content.style.opacity = '1';
        }, 600);
    }

    // Create Close Button
    const closeBtn = document.createElement('button');
    closeBtn.classList.add('corner-btn', 'close-btn'); // Use corner-btn class for shape
    
    // Position close button
    if (colorElement && colorElement.classList.contains('corner-btn')) {
         closeBtn.className = colorElement.className;
         closeBtn.classList.add('close-btn');
    } else {
        // Default position for menu items (Top Right)
        closeBtn.style.position = 'fixed';
        closeBtn.style.top = '2vh';
        closeBtn.style.right = '2vw';
        closeBtn.classList.add('close-btn');
    }
    
    closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
    document.body.appendChild(closeBtn);
    
    closeBtn.addEventListener('click', () => {
        // Hide content
        if (content) {
            content.style.opacity = '0';
            setTimeout(() => {
                content.classList.remove('active');
            }, 500);
        }

        circle.style.transform = 'scale(0)';
        setTimeout(() => {
            darkCircle.style.transform = 'scale(0)';
        }, 100); // Delay dark circle closing

        closeBtn.remove();
        
        // Remove circles after animation
        darkCircle.addEventListener('transitionend', () => {
            darkCircle.remove();
        }, { once: true });
        
        circle.addEventListener('transitionend', () => {
            circle.remove();
        }, { once: true });
    });
}

// Button Click Transition
document.querySelectorAll('.corner-btn').forEach(btn => {
    // Hover Effect (Infinite Spin)
    btn.addEventListener('mouseenter', () => {
        isHoveringButton = true;
    });
    
    btn.addEventListener('mouseleave', () => {
        isHoveringButton = false;
    });

    btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const targetId = btn.getAttribute('data-target');
        
        openSection(x, y, targetId, btn);
    });
});

// Top and Bottom Menu Text Scramble Effect
const menuItems = document.querySelectorAll('.top-menu-dropdown a, .bottom-menu-dropdown a');

menuItems.forEach(item => {
    // Click Event for Menu Items
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('href').substring(1); // Remove #
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;
        
        openSection(x, y, targetId, item);
    });

    item.dataset.value = item.innerText;
    
    item.addEventListener('mouseenter', () => {
        const targetText = item.dataset.value;
        const targetTextArray = targetText.split('');
        
        const paths = targetTextArray.map((char) => {
            if (char === ' ') return [char];
            
            const targetCode = char.charCodeAt(0);
            let startCode;
            
            // Pick a random start code
            if (targetCode >= 65 && targetCode <= 90) {
                do {
                    startCode = 65 + Math.floor(Math.random() * 26);
                } while (Math.abs(startCode - targetCode) < 5);
            } else if (targetCode >= 97 && targetCode <= 122) {
                do {
                    startCode = 97 + Math.floor(Math.random() * 26);
                } while (Math.abs(startCode - targetCode) < 5);
            } else {
                startCode = targetCode;
            }
            
            const path = [];
            if (startCode < targetCode) {
                for (let c = startCode; c <= targetCode; c++) path.push(String.fromCharCode(c));
            } else {
                for (let c = startCode; c >= targetCode; c--) path.push(String.fromCharCode(c));
            }
            return path;
        });
        
        let frame = 0;
        const maxFrames = Math.max(...paths.map(p => p.length));
        
        if (item.interval) clearInterval(item.interval);
        
        item.interval = setInterval(() => {
            let newText = "";
            
            for (let i = 0; i < targetTextArray.length; i++) {
                const path = paths[i];
                if (frame < path.length) {
                    newText += path[frame];
                } else {
                    newText += path[path.length - 1];
                }
            }
            
            item.innerText = newText;
            frame++;
            
            if (frame >= maxFrames) {
                clearInterval(item.interval);
            }
        }, 30);
    });
});

animate();