

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
let audioInput = document.getElementById("audioInput");
audioInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  audio = new Audio(URL.createObjectURL(file));
  audio.addEventListener("ended", () => {
    playFlag = false;
    recordIndex = 0;
    
  })
});

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
const orbitControls = new THREE.OrbitControls(orbitCamera, renderer.domElement);
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
const loader = new THREE.GLTFLoader();
loader.crossOrigin = "anonymous";
// Import model from URL, add your own model here
loader.load(
  "CoolBanana_voxel.vrm",

  gltf => {
    THREE.VRMUtils.removeUnnecessaryJoints(gltf.scene);

    THREE.VRM.from(gltf).then(vrm => {
      scene.add(vrm.scene);
      currentVrm = vrm;
      currentVrm.scene.rotation.y = Math.PI; // Rotate model 180deg to face camera
    });
  },

  progress =>
    console.log(
      "Loading model...",
      100.0 * (progress.loaded / progress.total),
      "%"
    ),

  error => console.error(error)
);

// Animate Rotation Helper function
const rigRotation = (
  name,
  rotation = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!currentVrm) { return }
  const Part = currentVrm.humanoid.getBoneNode(
    THREE.VRMSchema.HumanoidBoneName[name]
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
const rigPosition = (
  name,
  position = { x: 0, y: 0, z: 0 },
  dampener = 1,
  lerpAmount = 0.3
) => {
  if (!currentVrm) { return }
  const Part = currentVrm.humanoid.getBoneNode(
    THREE.VRMSchema.HumanoidBoneName[name]
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
const animateVRM = (results) => {
  
  // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
  let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

  const faceLandmarks = results.faceLandmarks;
  // Pose 3D Landmarks are with respect to Hip distance in meters
  const pose3DLandmarks = results.ea;
  // Pose 2D landmarks are with respect to videoWidth and videoHeight
  const pose2DLandmarks = results.poseLandmarks;
  // Be careful, hand landmarks may be reversed
  const leftHandLandmarks = results.rightHandLandmarks;
  const rightHandLandmarks = results.leftHandLandmarks;




  // Animate Pose
  if (pose2DLandmarks && pose3DLandmarks) {
    riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
      runtime: "mediapipe",
      video: videoElement,
    });
    
    rigRotation("Hips", riggedPose.Hips.rotation, 0.7);
    rigPosition(
      "Hips",
      {
        x: -riggedPose.Hips.position.x, // Reverse direction
        y: riggedPose.Hips.position.y + 1, // Add a bit of height
        z: -riggedPose.Hips.position.z // Reverse direction
      },
      1,
      0.07
    );

    rigRotation("Chest", riggedPose.Spine, 0.25, .3);
    rigRotation("Spine", riggedPose.Spine, 0.45, .3);
    

    rigRotation("RightUpperArm", riggedPose.RightUpperArm, 1, .3);
    rigRotation("RightLowerArm", riggedPose.RightLowerArm, 1, .3);
    rigRotation("LeftUpperArm", riggedPose.LeftUpperArm, .5, .3);
    rigRotation("LeftLowerArm", riggedPose.LeftLowerArm, .5, .3);

    rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg, 1, .3);
    rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg, 1, .3);
    rigRotation("RightUpperLeg", riggedPose.RightUpperLeg, 1, .3);
    rigRotation("RightLowerLeg", riggedPose.RightLowerLeg, 1, .3);
  }

  // Animate Hands
  
};

/* SETUP MEDIAPIPE HOLISTIC INSTANCE */
let videoElement = document.querySelector(".input_video"),
  guideCanvas = document.querySelector('canvas.guides');

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

const drawResults = (results) => {
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
