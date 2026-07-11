
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
/* THREEJS WORLD SETUP */
let currentVrm;
let recordFlag = false;
let playFlag = false;
let record = [];
let recordIndex = 0;
let recordStartTime = 0;
let playStartTime = 0;
let audio;
const recordButton = document.getElementById("recordButton");
/**
 * Toggle capture on/off.
 * Starts fresh recording, resets playback state, and syncs audio.
 */
let toggleRecording = () => {
  recordFlag = !recordFlag;
  if (recordFlag) {
    console.log("Recording Started");
    playFlag = false;
    record = [];
    recordIndex = 0;
    recordStartTime = performance.now();
    audio.play();
    recordButton.value = "Stop Recording";
  } else {
    console.log("Recording Stopped");
    audio.pause();
    audio.currentTime = 0;
    recordButton.value = "Start Recording";
  }
}
// Vector Math Helper Functions

/**
 * Subtract vector `b` from vector `a`.
 * @param {{x:number,y:number,z:number}} a First vector.
 * @param {{x:number,y:number,z:number}} b Second vector.
 * @returns {{x:number,y:number,z:number}} Difference vector.
 */
let sub = (a, b) => {
  // returns vector
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}
/**
 * Cross product of 3D vectors.
 * @param {{x:number,y:number,z:number}} a First vector.
 * @param {{x:number,y:number,z:number}} b Second vector.
 * @returns {{x:number,y:number,z:number}} Cross product vector.
 */
let cross = (a, b) => {
  // i dont exactly understand cross product but this is the formula, returns vector
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }
}
/**
 * Dot product of 3D vectors.
 * @param {{x:number,y:number,z:number}} a First vector.
 * @param {{x:number,y:number,z:number}} b Second vector.
 * @returns {number} Dot product.
 */
let dot = (a, b) => {
  // i get this one at least, returns number
  return a.x * b.x + a.y * b.y + a.z * b.z
}
/**
 * Vector length.
 * @param {{x:number,y:number,z:number}} v Vector.
 * @returns {number} Euclidean length.
 */
let len = (v) => {
  // pythagorean theorem 
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)
}
/**
 * Normalize vector to unit length.
 * @param {{x:number,y:number,z:number}} v Vector.
 * @returns {{x:number,y:number,z:number}} Normalized vector.
 */
let normalize = (v) => {
  // taking your vector and making it 1 unit long, but same direction
  let l = len(v);
  return { x: v.x / l, y: v.y / l, z: v.z / l }
}
/**
 * Midpoint between 2 vectors.
 * @param {{x:number,y:number,z:number}} a First point.
 * @param {{x:number,y:number,z:number}} b Second point.
 * @returns {{x:number,y:number,z:number}} Midpoint.
 */
let mid = (a, b) => {
  // between two points
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
}

/**
 * Clamp number into range.
 * @param {number} num Input value.
 * @param {number} min Minimum value.
 * @param {number} max Maximum value.
 * @returns {number} Clamped value.
 */
let clamp = (num, min, max) => {
  // biggest between num and min and smallest between that and max
  return Math.min(Math.max(num, min), max);
}

/**
 * angle between 2 vectors.
 * @param {{x:number,y:number,z:number}} a First point.
 * @param {{x:number,y:number,z:number}} b Second point.
 * @returns {{x:number,y:number,z:number}} angle.
 */
/*
let vecs2rot = (base, pointto) => {
  let direction = normalize(sub(pointto, base));

  return {
  x: Math.asin(clamp(direction.x, -1, 1)),
  y: Math.asin(clamp(direction.y, -1, 1)),
  z: Math.asin(clamp(direction.z, -1, 1))

  }
*/
// I think this one rotates it in relation to whats already rotated, is that true?
let vecs2rot = (base, pointto) => {
  let d = normalize(sub(pointto, base));

  return {
    x: -Math.atan2(d.y, Math.hypot(d.x, d.z)),
    y: Math.atan2(d.x, d.z),
    z: 0
  };
};
let palmRoll = (normal) => {
  return Math.atan2(normal.x, normal.y);
};

/**
 * Build DIY pose data from Mediapipe Holistic landmarks.
 * @param {object} results Mediapipe Holistic result payload.
 * @param {Array<{x:number,y:number,z?:number}>} results.poseLandmarks Pose landmarks.
 * @returns {{
 *   Hips: { position: {x:number,y:number,z:number}, rotation: {x:number,y:number,z:number} },
 *   Spine: {x:number,y:number,z:number},
 *   LeftUpperArm: {x:number,y:number,z:number},
 *   LeftLowerArm: {x:number,y:number,z:number},
 *   RightUpperArm: {x:number,y:number,z:number},
 *   RightLowerArm: {x:number,y:number,z:number},
 *   LeftUpperLeg: {x:number,y:number,z:number},
 *   LeftLowerLeg: {x:number,y:number,z:number},
 *   RightUpperLeg: {x:number,y:number,z:number},
 *   RightLowerLeg: {x:number,y:number,z:number},
 *   LeftHand: {x:number,y:number,z:number},
 *   RightHand: {x:number,y:number,z:number}
 * }} Pose output for VRM rigging.
 */
let solvePose = (results) => {
  if (!results?.poseLandmarks || results.poseLandmarks.length < 29) {
    return null;
  }

  // absolute given positions 
  let head = results.poseLandmarks[0];
  let leftShoulder = results.poseLandmarks[11];
  let rightShoulder = results.poseLandmarks[12];
  let leftHip = results.poseLandmarks[23];
  let rightHip = results.poseLandmarks[24];
  let leftKnee = results.poseLandmarks[25];
  let rightKnee = results.poseLandmarks[26];
  let leftAnkle = results.poseLandmarks[27];
  let rightAnkle = results.poseLandmarks[28];
  let leftElbow = results.poseLandmarks[13];
  let rightElbow = results.poseLandmarks[14];
  let leftWrist = results.poseLandmarks[15];
  let rightWrist = results.poseLandmarks[16];

  // hand orientation vectors
  let leftHandLandmarks = results.leftHandLandmarks;
  let rightHandLandmarks = results.rightHandLandmarks;
  let leftHandNormal = leftHandLandmarks && leftHandLandmarks[0] && leftHandLandmarks[5] && leftHandLandmarks[17]
    ? cross(sub(leftHandLandmarks[5], leftHandLandmarks[0]), sub(leftHandLandmarks[17], leftHandLandmarks[0]))
    : { x: 0, y: 1, z: 0 };
  let rightHandNormal = rightHandLandmarks && rightHandLandmarks[0] && rightHandLandmarks[5] && rightHandLandmarks[17]
    ? cross(sub(rightHandLandmarks[5], rightHandLandmarks[0]), sub(rightHandLandmarks[17], rightHandLandmarks[0]))
    : { x: 0, y: 1, z: 0 };

  // rotations
  let leftUpperArm = vecs2rot(leftShoulder, leftElbow);
  let rightUpperArm = vecs2rot(rightShoulder, rightElbow);
  let leftLowerArm = vecs2rot(leftElbow, leftWrist);
  let rightLowerArm = vecs2rot(rightElbow, rightWrist);
  let leftUpperLeg = vecs2rot(leftHip, leftKnee);
  let rightUpperLeg = vecs2rot(rightHip, rightKnee);
  let leftLowerLeg = vecs2rot(leftKnee, leftAnkle);
  let rightLowerLeg = vecs2rot(rightKnee, rightAnkle);
  let hips = mid(leftHip, rightHip);
  let shoulders = mid(leftShoulder, rightShoulder);
  let spine = mid(hips, shoulders);
  let hipsRotation = vecs2rot(hips, shoulders);
  let spineRotation = vecs2rot(spine, head);

  // hand rotations
  let leftHandRoll = palmRoll(leftHandNormal);
  let rightHandRoll = palmRoll(rightHandNormal);

  return {
    Hips: {
      position: hips,
      rotation: hipsRotation
    },
    Spine: spineRotation,
    LeftUpperArm: leftUpperArm,
    LeftLowerArm: leftLowerArm,
    RightUpperArm: rightUpperArm,
    RightLowerArm: rightLowerArm,
    LeftUpperLeg: leftUpperLeg,
    LeftLowerLeg: leftLowerLeg,
    RightUpperLeg: rightUpperLeg,
    RightLowerLeg: rightLowerLeg,
    LeftHand: { x: 0, y: 0, z: leftHandRoll },
    RightHand: { x: 0, y: 0, z: rightHandRoll }

  }

}
/**
 * Load audio file and reset playback state when track ends.
 * @param {Event} event File input change event.
 */
let audioInput = document.getElementById("audioInput");
audioInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  audio = new Audio(URL.createObjectURL(file));
  audio.addEventListener("ended", () => {
    playFlag = false;
    recordIndex = 0;

  })
});

/**
 * Start recorded playback from frame 0.
 * Uses timestamped frames and optional audio sync.
 */
let playRecording = () => {
  console.log(record);
  if (record.length === 0) {
    console.log("No recording to play");
    return;
  }
  recordFlag = false;
  playFlag = true;
  recordIndex = 0;
  playStartTime = performance.now();

  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
  playRecordedFrame();
}

/**
 * Advance playback by timestamp and apply current recorded frame.
 */
let playRecordedFrame = () => {
  if (!playFlag || record.length === 0) {
    return;
  }

  const elapsed = performance.now() - playStartTime;
  while (recordIndex < record.length - 1 && record[recordIndex + 1].t <= elapsed) {
    recordIndex++;
  }

  animateVRM(record[recordIndex].results);

  if (recordIndex < record.length - 1 || elapsed <= record[record.length - 1].t) {
    requestAnimationFrame(playRecordedFrame);
  } else {
    playFlag = false;
    recordIndex = 0;
  }
}
// renderer
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// camera
const orbitCamera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
orbitCamera.position.set(0.0, 1.4, 0.7);

// controls
const orbitControls = new OrbitControls(orbitCamera, renderer.domElement);
orbitControls.screenSpacePanning = true;
orbitControls.target.set(0.0, 1.4, 0.0);
orbitControls.update();

// scene
const scene = new THREE.Scene();

// light
const light = new THREE.DirectionalLight(0xffffff);
light.position.set(1.0, 1.0, 1.0).normalize();
scene.add(light);

// Main Render Loop
const clock = new THREE.Clock();

/**
 * Keep Three.js render loop and VRM physics alive.
 */
function animate() {
  requestAnimationFrame(animate);

  if (currentVrm) {
    // Update model to render physics
    currentVrm.update(clock.getDelta());
  }
  renderer.render(scene, orbitCamera);
}
animate();

/* VRM CHARACTER SETUP */

// Import Character VRM
const loader = new GLTFLoader();
loader.crossOrigin = "anonymous";
loader.register( ( parser ) => {

				return new VRMLoaderPlugin( parser );

			} );
// Import model from URL, add your own model here
loader.load(
  "CoolBanana_voxel.vrm",

  gltf => {
    

    let vrm = gltf.userData.vrm;
    VRMUtils.removeUnnecessaryVertices( gltf.scene );
					VRMUtils.combineSkeletons( gltf.scene );
					VRMUtils.combineMorphs( vrm );
          vrm.scene.traverse( ( obj ) => {

						obj.frustumCulled = false;

					} );
      scene.add(vrm.scene);
      currentVrm = vrm;
      currentVrm.scene.rotation.y = Math.PI; // Rotate model 180deg to face camera
    
  },
      (progress) => {

        console.log(
          "Loading model...",
          100.0 * (progress.loaded / progress.total),
          "%"
        )
      },
      (error) => console.error(error)
    );
  
// Animate Rotation Helper function
/**
 * Slerp named bone toward target rotation.
 * @param {string} name Bone name.
 * @param {{x:number,y:number,z:number}} rotation Target rotation in radians.
 * @param {number} dampener Rotation scale.
 * @param {number} lerpAmount Blend amount.
 */
const rigRotation = (
  name,
  rotation = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!currentVrm) { return }
  const Part = currentVrm.humanoid.getNormalizedBoneNode(
    name
  );
  if (!Part) { return }

  let euler = new THREE.Euler(
    rotation.x * dampener,
    rotation.y * dampener,
    rotation.z * dampener
  );
  let quaternion = new THREE.Quaternion().setFromEuler(euler);
  Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
};

// Animate Position Helper Function
/**
 * Lerp named bone toward target position.
 * @param {string} name Bone name.
 * @param {{x:number,y:number,z:number}} position Target position.
 * @param {number} dampener Position scale.
 * @param {number} lerpAmount Blend amount.
 */
const rigPosition = (
  name,
  position = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!currentVrm) { return }
  const Part = currentVrm.humanoid.getRawBoneNode(
    name
  );
  if (!Part) { return }
  let vector = new THREE.Vector3(
    position.x * dampener,
    position.y * dampener,
    position.z * dampener
  );
  Part.position.lerp(vector, lerpAmount); // interpolate
};



/* VRM Character Animator */
/**
 * Convert Holistic results into VRM bone transforms.
 * @param {object} results Mediapipe Holistic result payload.
 */
const animateVRM = (results) => {

  // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
  const riggedPose = solvePose(results);
  if (!riggedPose) {
    return;
  }

  rigRotation("hips", riggedPose.Hips.rotation, 0.7);
  rigPosition(
    "hips",
    {
      x: -riggedPose.Hips.position.x, // Reverse direction
      y: riggedPose.Hips.position.y + 1, // Add a bit of height
      z: -riggedPose.Hips.position.z // Reverse direction
    },
    1,
    0.07
  );

  rigRotation("chest", riggedPose.Spine, 0.25, .3);
  rigRotation("spine", riggedPose.Spine, 0.45, .3);


  rigRotation("rightUpperArm", riggedPose.RightUpperArm, 1, .3);
  rigRotation("rightLowerArm", riggedPose.RightLowerArm, 1, .3);
  rigRotation("leftUpperArm", riggedPose.LeftUpperArm, .5, .3);
  rigRotation("leftLowerArm", riggedPose.LeftLowerArm, .5, .3);

  rigRotation("leftUpperLeg", riggedPose.LeftUpperLeg, 1, .3);
  rigRotation("leftLowerLeg", riggedPose.LeftLowerLeg, 1, .3);
  rigRotation("rightUpperLeg", riggedPose.RightUpperLeg, 1, .3);
  rigRotation("rightLowerLeg", riggedPose.RightLowerLeg, 1, .3);
  // Animate Hands
  rigRotation("leftHand", riggedPose.LeftHand, 1, .3);
  rigRotation("rightHand", riggedPose.RightHand, 1, .3);
}




/* SETUP MEDIAPIPE HOLISTIC INSTANCE */
let videoElement = document.querySelector(".input_video"),
  guideCanvas = document.querySelector('canvas.guides');

/**
 * Handle one Holistic frame.
 * Record it if capture active, then draw guides and animate model.
 * @param {object} results Mediapipe Holistic result payload.
 */
const onResults = (results) => {
  // this pushes the results to our record; next step; implement json download
  if (recordFlag) {
    record.push({
      t: performance.now() - recordStartTime,
      results: {
        faceLandmarks: results.faceLandmarks,
        poseLandmarks: results.poseLandmarks,
        leftHandLandmarks: results.leftHandLandmarks,
        rightHandLandmarks: results.rightHandLandmarks,
        // still dont know what ea is
        ea: results.ea
      }
    });
  }
  if (playFlag) {
    return;
  }
  // Draw landmark guides
  drawResults(results)
  // Animate model
  if (!currentVrm) {
    return;
  }
  animateVRM(results);
}



const holistic = new Holistic({
  locateFile: file => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
  }
});

holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
  refineFaceLandmarks: false,
});
// Pass holistic a callback function
holistic.onResults(onResults);

/**
 * Draw pose and hand guides on overlay canvas.
 * @param {object} results Mediapipe Holistic result payload.
 */
const drawResults = (results) => {
  if (!results?.poseLandmarks) {
    return;
  }
  guideCanvas.width = videoElement.videoWidth;
  guideCanvas.height = videoElement.videoHeight;
  let canvasCtx = guideCanvas.getContext('2d');
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
  // Use `Mediapipe` drawing functions
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "#00cff7",
    lineWidth: 4
  });
  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: "#ff0364",
    lineWidth: 2
  });


  drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
    color: "#eb1064",
    lineWidth: 5
  });
  drawLandmarks(canvasCtx, results.leftHandLandmarks, {
    color: "#00cff7",
    lineWidth: 2
  });
  drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
    color: "#22c3e3",
    lineWidth: 5
  });
  drawLandmarks(canvasCtx, results.rightHandLandmarks, {
    color: "#ff0364",
    lineWidth: 2
  });
}

// Use `Mediapipe` utils to get camera - lower resolution = higher fps
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await holistic.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();
