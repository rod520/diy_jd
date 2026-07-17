let videoElement = document.querySelector(".input_video"),
  guideCanvas = document.querySelector('canvas.guides'),
  maskCanvas = document.querySelector('canvas.masked');

const recordButton = document.getElementById("recordButton");
let recordFlag = false;
let playFlag = false;
let chunks = [];
let latestPoseLandmarks = null;

const landmarkCircles = [
  { index: 0, radius: 80, color: "rgba(255, 255, 255, 1)" },
  { index: 15, radius: 40, color: "rgba(0, 207, 247, 1)" },
  { index: 16, radius: 40, color: "rgba(0, 207, 247, 1)" },
  { index: 27, radius: 40, color: "rgba(255, 3, 100, 1)" },
  { index: 28, radius: 40, color: "rgba(255, 3, 100, 1)" }
];

const drawLandmarkCircles = (canvasCtx, landmarks) => {
  if (!landmarks) {
    return;
  }

  landmarkCircles.forEach(({ index, radius, color }) => {
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
  });
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
  // Only overwrite existing pixels.
      canvasCtx.globalCompositeOperation = 'source-out';
  canvasCtx.fillStyle = '#00FF00';
  canvasCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  // Only overwrite missing pixels.
  canvasCtx.globalCompositeOperation = 'destination-atop';
  canvasCtx.drawImage(
    results.image, 0, 0, maskCanvas.width, maskCanvas.height);
  canvasCtx.globalCompositeOperation = 'source-over';
  drawLandmarkCircles(canvasCtx, latestPoseLandmarks);
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


