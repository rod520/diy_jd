let videoElement = document.querySelector(".input_video"),
  guideCanvas = document.querySelector('canvas.guides'),
  maskCanvas = document.querySelector('canvas.masked');

const recordButton = document.getElementById("recordButton");
let recordFlag = false;
let playFlag = false;
let chunks = [];
let latestPoseLandmarks = null;

const drawOn = (canvasCtx, landmarks) => {
  if (!landmarks) {
    return;
  }

  const drawCircle = (index, radius, color) => {
    const landmark = landmarks[index];
    if (!landmark) {
      return;
    }

    canvasCtx.beginPath();
    canvasCtx.arc(
      landmark.x * maskCanvas.width,
      landmark.y * maskCanvas.height,
      radius,
      0,
      Math.PI * 2
    );
    canvasCtx.fillStyle = color;
    canvasCtx.fill();
  };
// head circle: radius is .75 times distance to the shoulder (landmark 11)
  const shoulderDistance = Math.sqrt(
    Math.pow(landmarks[11].x * maskCanvas.width - landmarks[12].x * maskCanvas.width, 2) +
    Math.pow(landmarks[11].y * maskCanvas.height - landmarks[12].y * maskCanvas.height, 2)
  );
  const headRadius = shoulderDistance * 0.75;
  console.log("headRadius: " + headRadius);
  drawCircle(0, headRadius, "rgb(5, 47, 0)");

// wrist circles: radius is 3 times distance to the index finger (landmark 13) or half to elbow, whichever is smaller, centered on wrist (landmark 15 and 16)
  const wristDistance = Math.sqrt(
    Math.pow(landmarks[13].x * maskCanvas.width - landmarks[15].x * maskCanvas.width, 2) +
    Math.pow(landmarks[13].y * maskCanvas.height - landmarks[15].y * maskCanvas.height, 2)
  );
  const elbowDistance = Math.sqrt(
    Math.pow(landmarks[13].x * maskCanvas.width - landmarks[11].x * maskCanvas.width, 2) +
    Math.pow(landmarks[13].y * maskCanvas.height - landmarks[11].y * maskCanvas.height, 2)
  );
  const wristRadius = Math.min(3 * wristDistance, elbowDistance * 0.2);
  console.log("wristRadius: " + wristRadius);
  drawCircle(15, wristRadius, "rgba(0, 207, 247, 1)");
  drawCircle(16, wristRadius, "rgba(0, 207, 247, 1)");

  // foot: radius is distance to heel (landmark 29 and 30), centered on foot index
  const footDistance = Math.sqrt(
    Math.pow(landmarks[29].x * maskCanvas.width - landmarks[30].x * maskCanvas.width, 2) +
    Math.pow(landmarks[29].y * maskCanvas.height - landmarks[30].y * maskCanvas.height, 2)
  );
  const footRadius = footDistance * 0.5;
  drawCircle(31, footRadius, "rgba(255, 3, 100, 1)");
  drawCircle(32, footRadius, "rgba(255, 3, 100, 1)");

  canvasCtx.beginPath();
// draw a 4 sided polygon on each landmark  
canvasCtx.moveTo(landmarks[11].x * maskCanvas.width, landmarks[11].y * maskCanvas.height);
  canvasCtx.lineTo(landmarks[12].x * maskCanvas.width, landmarks[12].y * maskCanvas.height);
  canvasCtx.lineTo(landmarks[24].x * maskCanvas.width, landmarks[24].y * maskCanvas.height);
  canvasCtx.lineTo(landmarks[23].x * maskCanvas.width, landmarks[23].y * maskCanvas.height);
  canvasCtx.closePath();
  canvasCtx.fillStyle = "rgba(0, 207, 247, 0.5)";
  canvasCtx.fill();
};

let toggleRecording = () => {
  recordFlag = !recordFlag;
  if (recordFlag) {
    console.log("Recording Started");
    playFlag = false;
    recordIndex = 0;
    recordStartTime = performance.now();

    let stream = maskCanvas.captureStream(30)
    stream.addTracks(audio.captureStream().getTracks());
    let recorder = new MediaRecorder(stream, {mimeType: "video/mp4; codecs='avc1.42E01E, mp4a.40.2'"});
    recorder.start();
    audio.play();
    recordButton.value = "Stop Recording";
  } else {
    console.log("Recording Stopped");
    audio.pause();
    audio.currentTime = 0;
    recordButton.value = "Start Recording";
  }
}
const drawMask = (results) => {
  maskCanvas.width = videoElement.videoWidth;
  maskCanvas.height = videoElement.videoHeight;
  let canvasCtx = maskCanvas.getContext('2d');
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  canvasCtx.drawImage(results.segmentationMask, 0, 0,
    maskCanvas.width, maskCanvas.height);
//The new shape is drawn only where both the new shape and the destination canvas overlap. Everything else is made transparent.
      canvasCtx.globalCompositeOperation = 'source-atop';
  drawOn(canvasCtx, latestPoseLandmarks);
  // Only overwrite existing pixels.

 
    
  canvasCtx.restore();
  


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


const onResults = (results) => {
  latestPoseLandmarks = results.poseLandmarks;
  if (recordFlag) {
    record.push({
      t: performance.now() - recordStartTime,
      results: {
        poseLandmarks: results.poseLandmarks,
      }
    });
  }
  if (playFlag) {
    return;
  }
  // Draw landmark guides
  drawResults(results)
}

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

}

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



}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  }
});
pose.setOptions({
  modelComplexity: 2,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
pose.onResults(onResults);
const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
  }
});
selfieSegmentation.setOptions({
  modelSelection: 1,
  running_mode: 'LIVE_STREAM',
});
selfieSegmentation.onResults(drawMask);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
    await selfieSegmentation.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();


